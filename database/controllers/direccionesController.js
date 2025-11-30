const { getConnection, sql } = require('../config/database');

const agregarDireccionCliente = async (req, res) => {
    try {
        const {
            ClienteID,
            NombreDireccion,
            Calle,
            Zona,
            CiudadID,
            Referencia,
            EsPrincipal
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ClienteID', sql.Int, ClienteID)
            .input('NombreDireccion', sql.NVarChar(50), NombreDireccion || null)
            .input('Calle', sql.NVarChar(255), Calle)
            .input('Zona', sql.NVarChar(100), Zona || null)
            .input('CiudadID', sql.Int, CiudadID)
            .input('Referencia', sql.NVarChar(255), Referencia || null)
            .input('EsPrincipal', sql.Bit, EsPrincipal || 0)
            .execute('sp_AgregarDireccionCliente');

        res.status(201).json({
            success: true,
            message: 'Dirección agregada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en agregarDireccionCliente:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al agregar dirección'
        });
    }
};

const establecerDireccionPrincipal = async (req, res) => {
    try {
        const {
            DireccionID,
            ClienteID
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('DireccionID', sql.Int, DireccionID)
            .input('ClienteID', sql.Int, ClienteID)
            .execute('sp_EstablecerDireccionPrincipal');

        res.json({
            success: true,
            message: 'Dirección establecida como principal exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en establecerDireccionPrincipal:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al establecer dirección principal'
        });
    }
};

module.exports = {
    agregarDireccionCliente,
    establecerDireccionPrincipal
};