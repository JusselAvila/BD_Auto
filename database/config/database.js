const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER || 'jussel',
    password: process.env.DB_PASSWORD || '1',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || "Avila's Tyre Company",
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

const getConnection = async () => {
    try {
        if (pool) {
            return pool;
        }
        pool = await sql.connect(config);
        console.log('✓ Conectado a SQL Server exitosamente');
        return pool;
    } catch (error) {
        console.error('✗ Error al conectar a SQL Server:', error.message);
        throw error;
    }
};

const closeConnection = async () => {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            console.log('✓ Conexión cerrada');
        }
    } catch (error) {
        console.error('✗ Error al cerrar conexión:', error.message);
    }
};

module.exports = {
    sql,
    getConnection,
    closeConnection
};