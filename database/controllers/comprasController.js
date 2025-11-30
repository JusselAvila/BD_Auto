const { getConnection, sql } = require('../config/database');

const crearCompra = async (req, res) => {
    try {
        const {
            ProveedorID,
            UsuarioID,
            DetallesJSON,
            Observaciones
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ProveedorID', sql.Int, ProveedorID)
            .input('UsuarioID', sql.Int, UsuarioID)
            .input('DetallesJSON', sql.NVarChar(sql.MAX), JSON.stringify(DetallesJSON))
            .input('Observaciones', sql.NVarChar(500), Observaciones || null)
            .execute('sp_CrearCompra');

        res.status(201).json({
            success: true,
            message: 'Compra creada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearCompra:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear compra'
        });
    }
};

const cambiarEstadoCompra = async (req, res) => {
    try {
        const {
            CompraID,
            NuevoEstadoID,
            UsuarioID,
            Comentario
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('CompraID', sql.Int, CompraID)
            .input('NuevoEstadoID', sql.Int, NuevoEstadoID)
            .input('UsuarioID', sql.Int, UsuarioID)
            .input('Comentario', sql.NVarChar(500), Comentario || null)
            .execute('sp_CambiarEstadoCompra');

        res.json({
            success: true,
            message: 'Estado de compra actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en cambiarEstadoCompra:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cambiar estado de compra'
        });
    }
};

module.exports = {
    crearCompra,
    cambiarEstadoCompra
};