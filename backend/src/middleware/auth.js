const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
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

// Middleware para verificar rol de administrador
const verifyAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
};

// Middleware para verificar rol de staff o administrador
const verifyStaffOrAdmin = (req, res, next) => {
    if (req.usuario && (req.usuario.rol === 'admin' || req.usuario.rol === 'staf')) {
        next();
    } else {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de staff o administrador.' });
    }
};

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyStaffOrAdmin
};