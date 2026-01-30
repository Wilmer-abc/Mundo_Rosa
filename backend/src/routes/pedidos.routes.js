const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/pedidos
 * Obtiene todos los pedidos
 */
router.get('/', async (req, res) => {
  try {
    const [pedidos] = await db.query(`
      SELECT 
        p.id,
        p.codigo,
        p.cliente_id,
        c.nombre AS cliente_nombre,
        p.fecha_pedido,
        p.fecha_entrega,
        p.estado,
        p.total,
        p.notas,
        p.created_at,
        COUNT(dp.id) AS total_items
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN detalle_pedido dp ON p.id = dp.pedido_id
      GROUP BY p.id
      ORDER BY p.fecha_pedido DESC
    `);

    res.json(pedidos);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ message: 'Error al obtener pedidos' });
  }
});

/**
 * GET /api/pedidos/:id
 * Obtiene un pedido específico con sus detalles
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del pedido
    const [pedido] = await db.query(`
      SELECT 
        p.*,
        c.nombre AS cliente_nombre,
        c.email AS cliente_email,
        c.telefono AS cliente_telefono
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `, [id]);

    if (pedido.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Obtener detalles del pedido con información de productos e imágenes
    const [detalles] = await db.query(`
      SELECT 
        dp.*,
        pr.nombre AS producto_nombre,
        pr.descripcion AS producto_descripcion,
        pr.precio AS producto_precio,
        (
          SELECT JSON_ARRAYAGG(pi.imagen_url)
          FROM producto_imagen pi
          WHERE pi.producto_id = dp.producto_id
          ORDER BY pi.orden
          LIMIT 4
        ) AS producto_imagenes
      FROM detalle_pedido dp
      LEFT JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id = ?
    `, [id]);

    res.json({
      ...pedido[0],
      detalles: detalles
    });
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ message: 'Error al obtener el pedido' });
  }
});

/**
 * POST /api/pedidos
 * Crea un nuevo pedido
 */
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cliente_id, fecha_entrega, estado, notas, detalles } = req.body;
    
    // Generar código único para el pedido
    const codigo = `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calcular total
    let total = 0;
    detalles.forEach(detalle => {
      total += detalle.precio * detalle.cantidad;
    });

    // Insertar pedido
    const [resultPedido] = await connection.query(`
      INSERT INTO pedidos (codigo, cliente_id, fecha_entrega, estado, notas, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [codigo, cliente_id, fecha_entrega, estado || 'pendiente', notas, total]);

    const pedidoId = resultPedido.insertId;

    // Insertar detalles del pedido
    for (const detalle of detalles) {
      await connection.query(`
        INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio)
        VALUES (?, ?, ?, ?)
      `, [pedidoId, detalle.producto_id, detalle.cantidad, detalle.precio]);
    }

    await connection.commit();

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      pedidoId,
      codigo
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creando pedido:', error);
    res.status(500).json({ message: 'Error al crear el pedido' });
  } finally {
    connection.release();
  }
});

/**
 * PUT /api/pedidos/:id
 * Actualiza un pedido
 */
router.put('/:id', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { estado, fecha_entrega, notas } = req.body;

    await connection.query(`
      UPDATE pedidos 
      SET estado = ?, fecha_entrega = ?, notas = ?
      WHERE id = ?
    `, [estado, fecha_entrega, notas, id]);

    await connection.commit();

    res.json({ message: 'Pedido actualizado exitosamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ message: 'Error al actualizar el pedido' });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/pedidos/:id
 * Elimina un pedido
 */
router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;

    // Eliminar detalles del pedido primero
    await connection.query('DELETE FROM detalle_pedido WHERE pedido_id = ?', [id]);
    
    // Eliminar el pedido
    await connection.query('DELETE FROM pedidos WHERE id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Pedido eliminado exitosamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error eliminando pedido:', error);
    res.status(500).json({ message: 'Error al eliminar el pedido' });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/pedidos/productos/disponibles
 * Obtiene productos disponibles para pedidos con sus imágenes
 */
router.get('/productos/disponibles', async (req, res) => {
  try {
    const [productos] = await db.query(`
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.stock,
        p.activo,
        (
          SELECT JSON_ARRAYAGG(pi.imagen_url)
          FROM producto_imagen pi
          WHERE pi.producto_id = p.id
          ORDER BY pi.orden
          LIMIT 4
        ) AS imagenes
      FROM productos p
      WHERE p.activo = TRUE AND p.stock > 0
      ORDER BY p.nombre
    `);

    // Parsear JSON de imágenes si existe
    const productosConImagenes = productos.map(producto => ({
      ...producto,
      imagenes: producto.imagenes ? JSON.parse(producto.imagenes) : []
    }));

    res.json(productosConImagenes);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ message: 'Error al obtener productos disponibles' });
  }
});

module.exports = router;