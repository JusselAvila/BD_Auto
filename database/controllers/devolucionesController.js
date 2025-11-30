const { getConnection, sql } = require('../config/database');

const solicitarDevolucion = async (req, res) => {
    try {
        const {
            VentaID,
            ClienteID,
            Motivo,
            DetallesJSON
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('VentaID', sql.Int, VentaID)
            .input('ClienteID', sql.Int, ClienteID)
            .input('Motivo', sql.NVarChar(500), Motivo)
            .input('DetallesJSON', sql.NVarChar(sql.MAX), JSON.stringify(DetallesJSON))
            .execute('sp_SolicitarDevolucion');

        res.status(201).json({
            success: true,
            message: 'Devolución solicitada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en solicitarDevolucion:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al solicitar devolución'
        });
    }
};

const cambiarEstadoDevolucion = async (req, res) => {
    try {
        const {
            DevolucionID,
            NuevoEstadoID,
            UsuarioID,
            Comentario
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('DevolucionID', sql.Int, DevolucionID)
            .input('NuevoEstadoID', sql.Int, NuevoEstadoID)
            .input('UsuarioID', sql.Int, UsuarioID)
            .input('Comentario', sql.NVarChar(500), Comentario || null)
            .execute('sp_CambiarEstadoDevolucion');

        res.json({
            success: true,
            message: 'Estado de devolución actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en cambiarEstadoDevolucion:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cambiar estado de devolución'
        });
    }
};

module.exports = {
    solicitarDevolucion,
    cambiarEstadoDevolucion
};