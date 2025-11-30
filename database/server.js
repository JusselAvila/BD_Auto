const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { closeConnection } = require('./config/database');

const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const comprasRoutes = require('./routes/compras');
const ventasRoutes = require('./routes/ventas');
const devolucionesRoutes = require('./routes/devoluciones');
const promocionesRoutes = require('./routes/promociones');
const cuponesRoutes = require('./routes/cupones');
const direccionesRoutes = require('./routes/direcciones');
const proveedoresRoutes = require('./routes/proveedores');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: "API de Avila's Tyre Company - Sistema de Gestión de Ventas de Llantas",
        version: '1.0.0',
        ubicacion: 'Santa Cruz, Bolivia',
        endpoints: {
            clientes: {
                base: '/api/clientes',
                endpoints: [
                    'POST /api/clientes/persona',
                    'POST /api/clientes/empresa',
                    'PUT /api/clientes/persona',
                    'PUT /api/clientes/empresa'
                ]
            },
            productos: {
                base: '/api/productos',
                endpoints: [
                    'POST /api/productos',
                    'PUT /api/productos'
                ]
            },
            compras: {
                base: '/api/compras',
                endpoints: [
                    'POST /api/compras',
                    'PUT /api/compras/estado'
                ]
            },
            ventas: {
                base: '/api/ventas',
                endpoints: [
                    'POST /api/ventas',
                    'PUT /api/ventas/estado'
                ]
            },
            devoluciones: {
                base: '/api/devoluciones',
                endpoints: [
                    'POST /api/devoluciones',
                    'PUT /api/devoluciones/estado'
                ]
            },
            promociones: {
                base: '/api/promociones',
                endpoints: [
                    'POST /api/promociones',
                    'POST /api/promociones/asignar-productos',
                    'PUT /api/promociones/estado'
                ]
            },
            cupones: {
                base: '/api/cupones',
                endpoints: [
                    'POST /api/cupones',
                    'POST /api/cupones/validar',
                    'POST /api/cupones/aplicar'
                ]
            },
            direcciones: {
                base: '/api/direcciones',
                endpoints: [
                    'POST /api/direcciones',
                    'PUT /api/direcciones/principal'
                ]
            },
            proveedores: {
                base: '/api/proveedores',
                endpoints: [
                    'POST /api/proveedores',
                    'PUT /api/proveedores'
                ]
            }
        },
        storedProcedures: 22,
        categorias: [
            'Gestión de Clientes (4 SPs)',
            'Gestión de Productos (2 SPs)',
            'Gestión de Compras (2 SPs)',
            'Gestión de Ventas (2 SPs)',
            'Gestión de Devoluciones (2 SPs)',
            'Gestión de Promociones (3 SPs)',
            'Gestión de Cupones (3 SPs)',
            'Gestión de Direcciones (2 SPs)',
            'Gestión de Proveedores (2 SPs)'
        ]
    });
});

app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/devoluciones', devolucionesRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/cupones', cuponesRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/proveedores', proveedoresRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.path
    });
});

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
        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║   API - Avila\'s Tyre Company                              ║');
            console.log('║   Sistema de Gestión de Ventas de Llantas                 ║');
            console.log('╚════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
            console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ 22 Stored Procedures implementados`);
            console.log(`✓ 9 Categorías de endpoints disponibles`);
            console.log('');
            console.log('Presiona Ctrl+C para detener el servidor');
            console.log('');
        });
    } catch (error) {
        console.error('✗ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    console.log('\n\nCerrando servidor...');
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\nCerrando servidor...');
    await closeConnection();
    process.exit(0);
});

startServer();

module.exports = app;