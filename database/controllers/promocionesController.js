const { getConnection, sql } = require('../config/database');

const crearPromocion = async (req, res) => {
    try {
        const {
            NombrePromocion,
            Descripcion,
            TipoDescuento,
            ValorDescuento,
            FechaInicio,
            FechaFin,
            ProductosJSON
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('NombrePromocion', sql.NVarChar(150), NombrePromocion)
            .input('Descripcion', sql.NVarChar(500), Descripcion || null)
            .input('TipoDescuento', sql.NVarChar(20), TipoDescuento)
            .input('ValorDescuento', sql.Decimal(10, 2), ValorDescuento)
            .input('FechaInicio', sql.DateTime, FechaInicio)
            .input('FechaFin', sql.DateTime, FechaFin)
            .input('ProductosJSON', sql.NVarChar(sql.MAX), ProductosJSON ? JSON.stringify(ProductosJSON) : null)
            .execute('sp_CrearPromocion');

        res.status(201).json({
            success: true,
            message: 'Promoción creada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearPromocion:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear promoción'
        });
    }
};

const asignarProductosPromocion = async (req, res) => {
    try {
        const {
            PromocionID,
            ProductosJSON
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('PromocionID', sql.Int, PromocionID)
            .input('ProductosJSON', sql.NVarChar(sql.MAX), JSON.stringify(ProductosJSON))
            .execute('sp_AsignarProductosPromocion');

        res.json({
            success: true,
            message: 'Productos asignados a la promoción exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en asignarProductosPromocion:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al asignar productos a promoción'
        });
    }
};

const cambiarEstadoPromocion = async (req, res) => {
    try {
        const {
            PromocionID,
            Activa
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('PromocionID', sql.Int, PromocionID)
            .input('Activa', sql.Bit, Activa)
            .execute('sp_CambiarEstadoPromocion');

        res.json({
            success: true,
            message: Activa ? 'Promoción activada exitosamente' : 'Promoción desactivada exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en cambiarEstadoPromocion:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al cambiar estado de promoción'
        });
    }
};

module.exports = {
    crearPromocion,
    asignarProductosPromocion,
    cambiarEstadoPromocion
};