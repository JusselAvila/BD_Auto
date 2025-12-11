const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configuración de Bases de Datos
const { closeConnection: closeSQL } = require('./database/config/database');
const { connectMongoDB } = require('./database/config/mongo');

// Rutas
const authRoutes = require('./database/routes/auth'); // Auth Routes
const clientesRoutes = require('./database/routes/clientes');
const productosRoutes = require('./database/routes/productos');
const comprasRoutes = require('./database/routes/compras');
const ventasRoutes = require('./database/routes/ventas');
const devolucionesRoutes = require('./database/routes/devoluciones');
const promocionesRoutes = require('./database/routes/promociones');
const cuponesRoutes = require('./database/routes/cupones');
const direccionesRoutes = require('./database/routes/direcciones');
const proveedoresRoutes = require('./database/routes/proveedores');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Servir archivos estáticos del frontend

// Logging Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Ruta raíz con información de la API
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: "API de Avila's Tyre Company - Sistema de Gestión de Ventas de Llantas",
        version: '1.0.0',
        ubicacion: 'Santa Cruz, Bolivia',
        status: 'Online'
    });
});

// Registrar Rutas
app.use('/api', authRoutes); // login queda en /api/login como antes
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/devoluciones', devolucionesRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/cupones', cuponesRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// Manejo de 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.path
    });
});

// Manejo de Errores Global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const startServer = async () => {
    try {
        // Conectar MongoDB
        await connectMongoDB();

        // La conexión SQL se maneja bajo demanda en controllers, pero podemos validarla aquí si quisieras
        // await getConnection(); 

        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║   API - Avila\'s Tyre Company                              ║');
            console.log('║   Sistema de Gestión de Ventas de Llantas                 ║');
            console.log('╚════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
            console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ MongoDB Conectado`);
            console.log('');
            console.log('Presiona Ctrl+C para detener el servidor');
            console.log('');
        });
    } catch (error) {
        console.error('✗ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de cierre
const gracefulShutdown = async () => {
    console.log('\n\nCerrando servidor...');
    await closeSQL();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer();

module.exports = app;
