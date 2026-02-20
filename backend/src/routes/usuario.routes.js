// usuario.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');

// Configuración del transporter de nodemailer (ajusta según tu servicio de correo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    const query = 'SELECT * FROM usuario WHERE email = ?';
    const [usuarios] = await db.query(query, [email]);

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

  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ error: 'Error en servidor' });
  }
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

// Solicitar recuperación de contraseña
router.post('/recuperar-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Verificar si el usuario existe
    const query = 'SELECT * FROM usuario WHERE email = ?';
    const [usuarios] = await db.query(query, [email]);

    if (usuarios.length === 0) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({ mensaje: 'Si el email existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña' });
    }

    const usuario = usuarios[0];

    // Generar token único para recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en la base de datos (necesitarás añadir estas columnas)
    const updateQuery = 'UPDATE usuario SET reset_token = ?, reset_token_expiry = ? WHERE id = ?';
    await db.execute(updateQuery, [resetToken, resetTokenExpiry, usuario.id]);

    // Enviar email con el token (ajusta la URL según tu frontend)
    const resetUrl = `http://localhost:4200/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: '"Mundo Rosa" <noreply@mundoRosa.com>',
      to: email,
      subject: 'Recuperación de contraseña - Mundo Rosa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0f1729 0%, #1a1a2e 100%); color: white; border-radius: 10px;">
          <h2 style="color: #ff69b4; text-align: center;">Recuperación de Contraseña</h2>
          <p>Has solicitado recuperar tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #ff69b4 0%, #ff1493 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Restablecer Contraseña</a>
          </div>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <hr style="border: 1px solid #ff69b4;">
          <p style="font-size: 12px; text-align: center; color: #ffb6d9;">© 2024 Mundo Rosa. Todos los derechos reservados.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ mensaje: 'Si el email existe en nuestro sistema, recibirás instrucciones para recuperar tu contraseña' });

  } catch (error) {
    console.error('Error en recuperación:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Restablecer contraseña con token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    // Buscar usuario con token válido
    const query = 'SELECT * FROM usuario WHERE reset_token = ? AND reset_token_expiry > NOW()';
    const [usuarios] = await db.execute(query, [token]);

    if (usuarios.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const usuario = usuarios[0];

    // Hashear nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña y limpiar token
    const updateQuery = 'UPDATE usuario SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?';
    await db.execute(updateQuery, [hashedPassword, usuario.id]);

    res.json({ mensaje: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error al resetear password:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token es requerido' });
    }

    // Buscar usuario con token válido
    const query = 'SELECT id FROM usuario WHERE reset_token = ? AND reset_token_expiry > NOW()';
    const [usuarios] = await db.execute(query, [token]);

    if (usuarios.length === 0) {
      return res.json({ valido: false });
    }

    res.json({ valido: true });

  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


module.exports = router;