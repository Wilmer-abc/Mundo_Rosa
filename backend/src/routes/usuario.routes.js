const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['x-access-token'] || req.headers['authorization'];
    
    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }
    
    try {
        // Remover el prefijo 'Bearer ' si existe
        const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado', error: error.message });
    }
};

// Obtener todos los usuarios (protegido por token y solo para admins)
router.get('/', verificarToken, (req, res) => {
    // Verificar si el usuario es admin
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    db.query('SELECT idUsuario, nombre, email, rol FROM Usuario', (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.json(results);
    });
});

// Registrar nuevo usuario (solo admins pueden crear usuarios)
router.post('/', verificarToken, async (req, res) => {
    // Verificar si el usuario es admin
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const { nombre, email, password, rol } = req.body;
    
    // Validar que se proporcionen todos los campos requeridos
    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Validar que el rol sea válido
    if (rol !== 'admin' && rol !== 'staf') {
        return res.status(400).json({ message: 'Rol no válido. Debe ser "admin" o "staf"' });
    }
    
    try {
        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // Verificar si el email ya existe
        db.query('SELECT email FROM Usuario WHERE email = ?', [email], (error, results) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ message: 'El email ya está registrado' });
            }
            
            // Insertar el nuevo usuario
            const query = 'INSERT INTO Usuario (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
            db.query(query, [nombre, email, passwordHash, rol], (error, results) => {
                if (error) {
                    return res.status(500).json({ error: error.message });
                }
                
                res.status(201).json({
                    success: true,
                    message: 'Usuario creado exitosamente',
                    usuarioId: results.insertId
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// iniciarSesion(): Iniciar sesión y generar token
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Intento de login:', { email }); // No logear la contraseña
    console.log('Intento de login:', { password }); // No logear la contraseña


    
    // Validar que se proporcionen todos los campos requeridos
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    
    // Buscar usuario por email
    db.query('SELECT * FROM Usuario WHERE email = ?', [email], async (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        
        const usuario = results[0];
        
        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        console.log('Resultado de verificación de contraseña:', passwordValida);
        if (!passwordValida) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        
        // Generar token
        const token = jwt.sign(
            { 
                id: usuario.idUsuario, 
                nombre: usuario.nombre, 
                email: usuario.email, 
                rol: usuario.rol 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        // Actualizar el token en la base de datos
        db.query('UPDATE Usuario SET token = ? WHERE idUsuario = ?', [token, usuario.idUsuario], (updateError) => {
            if (updateError) {
                return res.status(500).json({ error: updateError.message });
            }
            
            res.json({
                success: true,
                message: 'Inicio de sesión exitoso',
                usuario: {
                    id: usuario.idUsuario,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol
                },
                token: token
            });
        });
    });
});

// cerrarSesion(): Cerrar sesión (invalidar token)
router.post('/logout', verificarToken, (req, res) => {
    // Actualizar a null el token en la base de datos
    console.log('Cierre sesion');
    db.query('UPDATE Usuario SET token = NULL WHERE idUsuario = ?', [req.usuario.id], (error) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    });
});

// asignarRol(rol: enum): Cambiar rol de usuario (solo admins)
router.put('/:id/rol', verificarToken, (req, res) => {
    // Verificar si el usuario es admin
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const usuarioId = req.params.id;
    const { rol } = req.body;
    
    // Validar que se proporcione el rol
    if (!rol) {
        return res.status(400).json({ message: 'El rol es requerido' });
    }
    
    // Validar que el rol sea válido
    if (rol !== 'admin' && rol !== 'staf') {
        return res.status(400).json({ message: 'Rol no válido. Debe ser "admin" o "staf"' });
    }
    
    // Actualizar el rol
    db.query('UPDATE Usuario SET rol = ? WHERE idUsuario = ?', [rol, usuarioId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Rol actualizado exitosamente'
        });
    });
});

// Actualizar datos de usuario
router.put('/:id', verificarToken, async (req, res) => {
    const usuarioId = req.params.id;
    const datos = { ...req.body };
    
    // Verificar que el usuario solo pueda modificar sus propios datos o sea admin
    if (req.usuario.id != usuarioId && req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: 'No tienes permiso para modificar este usuario' });
    }
    
    // Si se intenta cambiar la contraseña, hashearla
    if (datos.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            datos.password = await bcrypt.hash(datos.password, salt);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    
    // No permitir cambiar el rol a través de esta ruta
    delete datos.rol;
    
    // Verificar que se proporcionen datos para actualizar
    const campos = Object.keys(datos);
    if (campos.length === 0) {
        return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
    }
    
    // Construir consulta dinámica
    const setClause = campos.map(campo => `${campo} = ?`).join(', ');
    const valores = Object.values(datos);
    
    const query = `UPDATE Usuario SET ${setClause} WHERE idUsuario = ?`;
    valores.push(usuarioId);
    
    db.query(query, valores, (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Datos de usuario actualizados correctamente'
        });
    });
});

// Eliminar usuario (solo admin)
router.delete('/:id', verificarToken, (req, res) => {
    // Verificar si el usuario es admin
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    
    const usuarioId = req.params.id;
    
    // No permitir eliminar al propio usuario
    if (req.usuario.id == usuarioId) {
        return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }
    
    db.query('DELETE FROM Usuario WHERE idUsuario = ?', [usuarioId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    });
});

// Ruta pública para login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username y password son requeridos' });
    }

    db.query('SELECT * FROM Usuario WHERE email = ?', [username], async (error, results) => {
        if (error) return res.status(500).json({ error: error.message });

        if (results.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const usuario = results[0];

        const passwordMatch = await bcrypt.compare(password, usuario.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.idUsuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            rol: usuario.rol,
            nombre: usuario.nombre,
        });
    });
});

module.exports = router;