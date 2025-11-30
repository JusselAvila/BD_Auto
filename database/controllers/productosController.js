const { getConnection, sql } = require('../config/database');

const crearProducto = async (req, res) => {
    try {
        const {
            CodigoProducto,
            NombreProducto,
            Descripcion,
            CategoriaID,
            MarcaID,
            Ancho,
            Perfil,
            DiametroRin,
            IndiceCarga,
            IndiceVelocidad,
            PrecioCompraBs,
            PrecioVentaBs,
            StockMinimo,
            StockActual,
            Destacado
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('CodigoProducto', sql.NVarChar(50), CodigoProducto)
            .input('NombreProducto', sql.NVarChar(255), NombreProducto)
            .input('Descripcion', sql.NVarChar(sql.MAX), Descripcion || null)
            .input('CategoriaID', sql.Int, CategoriaID)
            .input('MarcaID', sql.Int, MarcaID)
            .input('Ancho', sql.Int, Ancho || null)
            .input('Perfil', sql.Int, Perfil || null)
            .input('DiametroRin', sql.Int, DiametroRin || null)
            .input('IndiceCarga', sql.NVarChar(10), IndiceCarga || null)
            .input('IndiceVelocidad', sql.NVarChar(10), IndiceVelocidad || null)
            .input('PrecioCompraBs', sql.Decimal(10, 2), PrecioCompraBs)
            .input('PrecioVentaBs', sql.Decimal(10, 2), PrecioVentaBs)
            .input('StockMinimo', sql.Int, StockMinimo)
            .input('StockActual', sql.Int, StockActual)
            .input('Destacado', sql.Bit, Destacado || 0)
            .execute('sp_CrearProducto');

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearProducto:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear producto'
        });
    }
};

const actualizarProducto = async (req, res) => {
    try {
        const {
            ProductoID,
            NombreProducto,
            Descripcion,
            PrecioCompraBs,
            PrecioVentaBs,
            StockMinimo,
            Destacado,
            Activo
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ProductoID', sql.Int, ProductoID)
            .input('NombreProducto', sql.NVarChar(255), NombreProducto || null)
            .input('Descripcion', sql.NVarChar(sql.MAX), Descripcion || null)
            .input('PrecioCompraBs', sql.Decimal(10, 2), PrecioCompraBs || null)
            .input('PrecioVentaBs', sql.Decimal(10, 2), PrecioVentaBs || null)
            .input('StockMinimo', sql.Int, StockMinimo || null)
            .input('Destacado', sql.Bit, Destacado || null)
            .input('Activo', sql.Bit, Activo || null)
            .execute('sp_ActualizarProducto');

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en actualizarProducto:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar producto'
        });
    }
};

module.exports = {
    crearProducto,
    actualizarProducto
};