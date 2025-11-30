const { getConnection, sql } = require('../config/database');

const crearProveedor = async (req, res) => {
    try {
        const {
            NombreProveedor,
            NIT,
            Telefono,
            Email,
            Direccion,
            CiudadID
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('NombreProveedor', sql.NVarChar(150), NombreProveedor)
            .input('NIT', sql.NVarChar(20), NIT)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .input('Email', sql.NVarChar(100), Email || null)
            .input('Direccion', sql.NVarChar(255), Direccion || null)
            .input('CiudadID', sql.Int, CiudadID || null)
            .execute('sp_CrearProveedor');

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearProveedor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear proveedor'
        });
    }
};

const actualizarProveedor = async (req, res) => {
    try {
        const {
            ProveedorID,
            NombreProveedor,
            Telefono,
            Email,
            Direccion,
            CiudadID
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ProveedorID', sql.Int, ProveedorID)
            .input('NombreProveedor', sql.NVarChar(150), NombreProveedor || null)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .input('Email', sql.NVarChar(100), Email || null)
            .input('Direccion', sql.NVarChar(255), Direccion || null)
            .input('CiudadID', sql.Int, CiudadID || null)
            .execute('sp_ActualizarProveedor');

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en actualizarProveedor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar proveedor'
        });
    }
};

module.exports = {
    crearProveedor,
    actualizarProveedor
};