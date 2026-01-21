const express = require('express');
const router = express.Router();
const db = require('../db');
/**
 * GET /api/dashboard/resumen
 * Datos generales para el dashboard
 */
router.get('/resumen', async (req, res) => {
  try {
    // Total ventas
    const [ventas] = await db.query(`
      SELECT IFNULL(SUM(total), 0) AS totalVentas
      FROM ventas
    `);

    // Pedidos pendientes
    const [pedidosPendientes] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE estado = 'pendiente'
    `);

    // Productos con stock bajo
    const [stockBajo] = await db.query(`
      SELECT COUNT(*) AS total
      FROM productos
      WHERE stock <= stock_minimo
    `);

    // Total clientes
    const [clientes] = await db.query(`
      SELECT COUNT(*) AS total
      FROM clientes
    `);

    res.json({
      totalVentas: ventas[0].totalVentas,
      pedidosPendientes: pedidosPendientes[0].total,
      productosStockBajo: stockBajo[0].total,
      totalClientes: clientes[0].total
    });

  } catch (error) {
    console.error('Error dashboard resumen:', error);
    res.status(500).json({ message: 'Error al obtener datos del dashboard' });
  }
});

/**
 * GET /api/dashboard/ventas-mensuales
 */
router.get('/ventas-mensuales', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        MONTH(fecha) AS mes,
        SUM(total) AS total
      FROM ventas
      WHERE YEAR(fecha) = YEAR(CURDATE())
      GROUP BY MONTH(fecha)
      ORDER BY mes
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener ventas mensuales' });
  }
});

/**
 * GET /api/dashboard/productos-mas-vendidos
 */
router.get('/productos-mas-vendidos', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.nombre,
        SUM(dp.cantidad) AS totalVendido
      FROM detalle_pedido dp
      INNER JOIN productos p ON p.id = dp.producto_id
      GROUP BY p.id
      ORDER BY totalVendido DESC
      LIMIT 5
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener productos más vendidos' });
  }
});

module.exports = router;
