const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');

// Crear directorio de uploads si no existe
const uploadDir = 'uploads/productos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por imagen
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// GET todos los productos
router.get('/', async (req, res) => {
    try {
        const [productos] = await db.execute(`
            SELECT p.*, 
                   GROUP_CONCAT(pi.imagen_url ORDER BY pi.orden) as imagenes
            FROM producto p
            LEFT JOIN producto_imagen pi ON p.id = pi.producto_id
            WHERE p.activo = 1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        // Convertir el string de imágenes a array
        const productosConImagenes = productos.map(producto => ({
            ...producto,
            imagenes: producto.imagenes ? producto.imagenes.split(',') : [],
            // Asegurar que los booleanos sean verdaderos booleanos
            es_nuevo: !!producto.es_nuevo,
            es_oferta: !!producto.es_oferta,
            es_destacado: !!producto.es_destacado,
            activo: !!producto.activo
        }));
        
        res.json(productosConImagenes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET producto por ID
router.get('/:id', async (req, res) => {
    try {
        const [productos] = await db.execute(`
            SELECT p.*, 
                   pi.id as imagen_id,
                   pi.imagen_url,
                   pi.orden
            FROM producto p
            LEFT JOIN producto_imagen pi ON p.id = pi.producto_id
            WHERE p.id = ? AND p.activo = 1
            ORDER BY pi.orden
        `, [req.params.id]);
        
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Estructurar las imágenes en un array
        const producto = {
            id: productos[0].id,
            nombre: productos[0].nombre,
            descripcion: productos[0].descripcion,
            categoria: productos[0].categoria,
            marca: productos[0].marca,
            precio_compra: productos[0].precio_compra,
            precio: productos[0].precio, // Precio base
            precio_venta: productos[0].precio_venta,
            precio_oferta: productos[0].precio_oferta,
            caracteristicas: productos[0].caracteristicas,
            stock: productos[0].stock,
            es_nuevo: !!productos[0].es_nuevo,
            es_oferta: !!productos[0].es_oferta,
            es_destacado: !!productos[0].es_destacado,
            activo: !!productos[0].activo,
            created_at: productos[0].created_at,
            updated_at: productos[0].updated_at,
            imagenes: productos
                .filter(p => p.imagen_url)
                .map(p => ({
                    id: p.imagen_id,
                    imagen_url: p.imagen_url,
                    orden: p.orden
                }))
        };
        
        res.json(producto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
});

// POST crear nuevo producto (con upload de imágenes)
router.post('/', upload.array('imagenes', 4), async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Extraer datos del formulario
        const {
            nombre,
            descripcion,
            categoria,
            marca,
            precio_compra,
            precio_venta,
            precio_oferta,
            caracteristicas,
            stock,
            es_nuevo = true,
            es_oferta = false,
            es_destacado = false
        } = req.body;
        
        // Validaciones básicas
        if (!nombre || !descripcion || !precio_venta || stock === undefined) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: nombre, descripcion, precio_venta, stock' 
            });
        }
        
        // Determinar el precio principal (si hay oferta usar precio_oferta, sino precio_venta)
        const precio_principal = precio_oferta && parseFloat(precio_oferta) > 0 
            ? parseFloat(precio_oferta) 
            : parseFloat(precio_venta);
        
        // Insertar producto principal
        const [productoResult] = await connection.execute(
            `INSERT INTO producto (
                nombre, descripcion, categoria, marca, 
                precio_compra, precio, precio_venta, precio_oferta,
                caracteristicas, stock, es_nuevo, es_oferta, es_destacado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                descripcion,
                categoria || null,
                marca || null,
                precio_compra ? parseFloat(precio_compra) : null,
                precio_principal,
                parseFloat(precio_venta),
                precio_oferta ? parseFloat(precio_oferta) : null,
                caracteristicas || null,
                parseInt(stock),
                es_nuevo === 'true' || es_nuevo === true,
                es_oferta === 'true' || es_oferta === true,
                es_destacado === 'true' || es_destacado === true
            ]
        );
        
        const productoId = productoResult.insertId;
        
        // Insertar imágenes si existen
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = `/uploads/productos/${req.files[i].filename}`;
                await connection.execute(
                    'INSERT INTO producto_imagen (producto_id, imagen_url, orden) VALUES (?, ?, ?)',
                    [productoId, imagePath, i]
                );
            }
        }
        
        await connection.commit();
        
        // Obtener el producto creado
        const [productoCreado] = await db.execute(`
            SELECT p.*, 
                   GROUP_CONCAT(pi.imagen_url ORDER BY pi.orden) as imagenes
            FROM producto p
            LEFT JOIN producto_imagen pi ON p.id = pi.producto_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [productoId]);
        
        const productoCompleto = {
            ...productoCreado[0],
            imagenes: productoCreado[0].imagenes ? productoCreado[0].imagenes.split(',') : [],
            es_nuevo: !!productoCreado[0].es_nuevo,
            es_oferta: !!productoCreado[0].es_oferta,
            es_destacado: !!productoCreado[0].es_destacado
        };
        
        res.status(201).json({
            message: 'Producto creado correctamente',
            producto: productoCompleto
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error al crear producto:', error);
        
        // Eliminar archivos subidos si hay error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ 
            error: 'Error al crear el producto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// PUT actualizar producto
router.put('/:id', upload.array('imagenes', 4), async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const productoId = req.params.id;
        const {
            nombre,
            descripcion,
            categoria,
            marca,
            precio_compra,
            precio_venta,
            precio_oferta,
            caracteristicas,
            stock,
            es_nuevo = true,
            es_oferta = false,
            es_destacado = false,
            activo = true,
            imagenes_existentes = '[]' // JSON string de imágenes existentes que se mantienen
        } = req.body;
        
        // Verificar si el producto existe
        const [productoExistente] = await connection.execute(
            'SELECT id FROM producto WHERE id = ?',
            [productoId]
        );
        
        if (productoExistente.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Determinar el precio principal
        const precio_principal = precio_oferta && parseFloat(precio_oferta) > 0 
            ? parseFloat(precio_oferta) 
            : parseFloat(precio_venta);
        
        // Actualizar producto principal
        await connection.execute(
            `UPDATE producto SET 
                nombre = ?, 
                descripcion = ?, 
                categoria = ?, 
                marca = ?,
                precio_compra = ?, 
                precio = ?, 
                precio_venta = ?, 
                precio_oferta = ?,
                caracteristicas = ?, 
                stock = ?, 
                es_nuevo = ?, 
                es_oferta = ?, 
                es_destacado = ?,
                activo = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                nombre,
                descripcion,
                categoria || null,
                marca || null,
                precio_compra ? parseFloat(precio_compra) : null,
                precio_principal,
                parseFloat(precio_venta),
                precio_oferta ? parseFloat(precio_oferta) : null,
                caracteristicas || null,
                parseInt(stock),
                es_nuevo === 'true' || es_nuevo === true,
                es_oferta === 'true' || es_oferta === true,
                es_destacado === 'true' || es_destacado === true,
                activo === 'true' || activo === true,
                productoId
            ]
        );
        
        // Manejar imágenes
        let imagenesMantener = [];
        try {
            imagenesMantener = JSON.parse(imagenes_existentes);
        } catch (e) {
            imagenesMantener = [];
        }
        
        // Eliminar imágenes que ya no están
        if (imagenesMantener.length > 0) {
            await connection.execute(
                `DELETE FROM producto_imagen 
                 WHERE producto_id = ? 
                 AND imagen_url NOT IN (${imagenesMantener.map(() => '?').join(',')})`,
                [productoId, ...imagenesMantener]
            );
        } else {
            // Si no hay imágenes para mantener, eliminar todas
            await connection.execute(
                'DELETE FROM producto_imagen WHERE producto_id = ?',
                [productoId]
            );
        }
        
        // Insertar nuevas imágenes
        if (req.files && req.files.length > 0) {
            // Obtener el máximo orden actual
            const [imagenesActuales] = await connection.execute(
                'SELECT COALESCE(MAX(orden), -1) as max_orden FROM producto_imagen WHERE producto_id = ?',
                [productoId]
            );
            
            let ordenInicio = imagenesActuales[0].max_orden + 1;
            
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = `/uploads/productos/${req.files[i].filename}`;
                await connection.execute(
                    'INSERT INTO producto_imagen (producto_id, imagen_url, orden) VALUES (?, ?, ?)',
                    [productoId, imagePath, ordenInicio + i]
                );
            }
        }
        
        await connection.commit();
        
        // Obtener el producto actualizado
        const [productoActualizado] = await db.execute(`
            SELECT p.*, 
                   GROUP_CONCAT(pi.imagen_url ORDER BY pi.orden) as imagenes
            FROM producto p
            LEFT JOIN producto_imagen pi ON p.id = pi.producto_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [productoId]);
        
        res.json({
            message: 'Producto actualizado correctamente',
            producto: {
                ...productoActualizado[0],
                imagenes: productoActualizado[0].imagenes ? productoActualizado[0].imagenes.split(',') : []
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar producto:', error);
        
        // Eliminar archivos subidos si hay error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
        
        res.status(500).json({ 
            error: 'Error al actualizar el producto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        connection.release();
    }
});

// DELETE producto (desactivar)
router.delete('/:id', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Primero obtener las imágenes para poder eliminarlas físicamente
        const [imagenes] = await connection.execute(
            'SELECT imagen_url FROM producto_imagen WHERE producto_id = ?',
            [req.params.id]
        );
        
        // Desactivar el producto
        await connection.execute(
            'UPDATE producto SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.params.id]
        );
        
        // Eliminar imágenes físicamente del servidor
        imagenes.forEach(imagen => {
            const imagePath = `uploads/productos/${path.basename(imagen.imagen_url)}`;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        });
        
        // Opcional: eliminar las imágenes de la base de datos
        await connection.execute(
            'DELETE FROM producto_imagen WHERE producto_id = ?',
            [req.params.id]
        );
        
        await connection.commit();
        
        res.json({ 
            message: 'Producto eliminado correctamente',
            imagenes_eliminadas: imagenes.length
        });
        
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    } finally {
        connection.release();
    }
});

module.exports = router;