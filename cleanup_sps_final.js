require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function dropSPs() {
    try {
        await sql.connect(sqlConfig);

        console.log('Eliminando stored procedures...');

        try {
            await sql.query`DROP PROCEDURE IF EXISTS sp_ObtenerDetalleVentasCliente`;
            console.log('✅ sp_ObtenerDetalleVentasCliente eliminado');
        } catch (e) {
            console.log('sp_ObtenerDetalleVentasCliente no existe o ya fue eliminado');
        }

        try {
            await sql.query`DROP PROCEDURE IF EXISTS sp_ObtenerDetalleVenta`;
            console.log('✅ sp_ObtenerDetalleVenta eliminado');
        } catch (e) {
            console.log('sp_ObtenerDetalleVenta no existe o ya fue eliminado');
        }

        console.log('\n✅ Limpieza de SPs completada');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

dropSPs();
