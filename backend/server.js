require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Importar rutas
const usuarioRoutes = require('./src/routes/usuario.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const pedidosRoutes = require('./src/routes/pedidos.routes');
const productosRoutes = require('./src/routes/productos.routes');

const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Rutas publicas
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/productos', productosRoutes);

// 404 JSON para /api/*
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
