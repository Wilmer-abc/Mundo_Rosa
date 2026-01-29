// usuario.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(403).json({ error: 'Token no proporcionado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Middleware para verificar rol admin
const verifyAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol admin' });
    }
    next();
};

// Iniciar sesión (para admin y cliente)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  const query = 'SELECT * FROM usuario WHERE email = ?';

  db.query(query, [email], async (error, usuarios) => {
    if (error) {
      console.error('Error DB:', error);
      return res.status(500).json({ error: 'Error en base de datos' });
    }

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombre
      },
      process.env.JWT_SECRET || 'tu_secreto_jwt',
      { expiresIn: '8h' }
    );

    const { password: _, ...usuarioSinPassword } = usuario;
    usuarioSinPassword.rol = usuarioSinPassword.rol.trim().toLowerCase();

    res.json({
      token,
      usuario: usuarioSinPassword
    });
  });
});


// Cerrar sesión (manejado en el cliente, pero puedes invalidar token si usas blacklist)
router.post('/logout', verifyToken, (req, res) => {
    // En un sistema real, podrías agregar el token a una blacklist
    // Por ahora, el cliente simplemente eliminará el token
    res.json({ mensaje: 'Sesión cerrada exitosamente' });
});

// Ruta protegida solo para admin - Ver perfil del admin
router.get('/admin/perfil', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const query = 'SELECT id, nombre, email, rol, created_at FROM usuario WHERE id = ?';
        const [usuarios] = await db.execute(query, [req.user.id]);
        
        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(usuarios[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para que admin pueda ver todos los usuarios
router.get('/admin/usuarios', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const query = `
            SELECT id, nombre, email, rol, created_at 
            FROM usuario 
            ORDER BY created_at DESC
        `;
        const [usuarios] = await db.execute(query);
        
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para que admin pueda crear nuevos usuarios (incluyendo otros admins)
router.post('/admin/usuarios', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { nombre, email, password, rol = 'cliente' } = req.body;
        
        // Validaciones
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
        }
        
        if (!['admin', 'cliente'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }
        
        // Verificar si el email ya existe
        const checkEmailQuery = 'SELECT id FROM usuario WHERE email = ?';
        const [existingUsers] = await db.execute(checkEmailQuery, [email]);
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        // Hash del password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insertar nuevo usuario
        const insertQuery = `
            INSERT INTO usuario (nombre, email, password, rol) 
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(insertQuery, [nombre, email, hashedPassword, rol]);
        
        res.status(201).json({
            mensaje: 'Usuario creado exitosamente',
            usuarioId: result.insertId,
            usuario: { nombre, email, rol }
        });
        
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar token (para validar desde el cliente)
router.get('/verify', verifyToken, (req, res) => {
    res.json({
        valido: true,
        usuario: req.user
    });
});

module.exports = router;