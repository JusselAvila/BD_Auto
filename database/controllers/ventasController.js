const { getConnection, sql } = require('../config/database');

const crearVenta = async (req, res) => {
    try {
        const {
            ClienteID,
            DireccionEnvioID,
            MetodoPagoID,
            CuponID,
            Observaciones,
            DetallesJSON,
            UsuarioID
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ClienteID', sql.Int, ClienteID)
            .input('DireccionEnvioID', sql.Int, DireccionEnvioID)
            .input('MetodoPagoID', sql.Int, MetodoPagoID)
            .input('CuponID', sql.Int, CuponID || null)
            .input('Observaciones', sql.NVarChar(500), Observaciones || null)
            .input('DetallesJSON', sql.NVarChar(sql.MAX), JSON.stringify(DetallesJSON))
            .input('UsuarioID', sql.Int, UsuarioID)
            .execute('sp_CrearVenta');

        res.status(201).json({
            success: true,
            message: 'Venta creada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearVenta:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear venta'
        });
    }
};

const cambiarEstadoVenta = async (req, res) => {
    try {
        const {
            VentaID,
            NuevoEstadoID,
            UsuarioID,
            Comentario
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('VentaID', sql.Int, VentaID)
            .input('NuevoEstadoID', sql.Int, NuevoEstadoID)
            .input('UsuarioID', sql.Int, UsuarioID)
            .input('Comentario', sql.NVarChar(500), Comentario || null)
            .execute('sp_CambiarEstadoVenta');

        res.json({
            success: true,
            message: 'Estado de venta actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en cambiarEstadoVenta:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cambiar estado de venta'
        });
    }
};

module.exports = {
    crearVenta,
    cambiarEstadoVenta
};