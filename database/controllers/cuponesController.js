const { getConnection, sql } = require('../config/database');

const crearCupon = async (req, res) => {
    try {
        const {
            CodigoCupon,
            Descripcion,
            TipoDescuento,
            ValorDescuento,
            MontoMinCompra,
            UsosMaximos,
            FechaInicio,
            FechaExpiracion
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('CodigoCupon', sql.NVarChar(50), CodigoCupon)
            .input('Descripcion', sql.NVarChar(255), Descripcion || null)
            .input('TipoDescuento', sql.NVarChar(20), TipoDescuento)
            .input('ValorDescuento', sql.Decimal(10, 2), ValorDescuento)
            .input('MontoMinCompra', sql.Decimal(10, 2), MontoMinCompra || 0)
            .input('UsosMaximos', sql.Int, UsosMaximos || null)
            .input('FechaInicio', sql.DateTime, FechaInicio)
            .input('FechaExpiracion', sql.DateTime, FechaExpiracion)
            .execute('sp_CrearCupon');

        res.status(201).json({
            success: true,
            message: 'Cupón creado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearCupon:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear cupón'
        });
    }
};

const validarCupon = async (req, res) => {
    try {
        const {
            CodigoCupon,
            MontoCompra
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('CodigoCupon', sql.NVarChar(50), CodigoCupon)
            .input('MontoCompra', sql.Decimal(10, 2), MontoCompra)
            .execute('sp_ValidarCupon');

        const validacion = result.recordset[0];

        res.json({
            success: validacion.Valido === 1,
            message: validacion.Mensaje,
            data: validacion
        });
    } catch (error) {
        console.error('Error en validarCupon:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al validar cupón'
        });
    }
};

const aplicarCupon = async (req, res) => {
    try {
        const { CuponID } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('CuponID', sql.Int, CuponID)
            .execute('sp_AplicarCupon');

        res.json({
            success: true,
            message: 'Cupón aplicado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en aplicarCupon:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al aplicar cupón'
        });
    }
};

module.exports = {
    crearCupon,
    validarCupon,
    aplicarCupon
};