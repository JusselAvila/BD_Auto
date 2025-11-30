const { getConnection, sql } = require('../config/database');

const crearClientePersona = async (req, res) => {
    try {
        const {
            Email,
            PasswordHash,
            Nombres,
            ApellidoPaterno,
            ApellidoMaterno,
            CI,
            Telefono,
            FechaNacimiento
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('Email', sql.NVarChar(100), Email)
            .input('PasswordHash', sql.NVarChar(255), PasswordHash)
            .input('Nombres', sql.NVarChar(100), Nombres)
            .input('ApellidoPaterno', sql.NVarChar(100), ApellidoPaterno)
            .input('ApellidoMaterno', sql.NVarChar(100), ApellidoMaterno || null)
            .input('CI', sql.NVarChar(20), CI)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .input('FechaNacimiento', sql.Date, FechaNacimiento || null)
            .execute('sp_CrearClientePersona');

        res.status(201).json({
            success: true,
            message: 'Cliente persona creado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearClientePersona:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear cliente persona'
        });
    }
};

const crearClienteEmpresa = async (req, res) => {
    try {
        const {
            Email,
            PasswordHash,
            RazonSocial,
            NombreComercial,
            NIT,
            Telefono
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('Email', sql.NVarChar(100), Email)
            .input('PasswordHash', sql.NVarChar(255), PasswordHash)
            .input('RazonSocial', sql.NVarChar(255), RazonSocial)
            .input('NombreComercial', sql.NVarChar(255), NombreComercial || null)
            .input('NIT', sql.NVarChar(20), NIT)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .execute('sp_CrearClienteEmpresa');

        res.status(201).json({
            success: true,
            message: 'Cliente empresa creado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en crearClienteEmpresa:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al crear cliente empresa'
        });
    }
};

const actualizarClientePersona = async (req, res) => {
    try {
        const {
            ClienteID,
            Nombres,
            ApellidoPaterno,
            ApellidoMaterno,
            Telefono,
            FechaNacimiento
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ClienteID', sql.Int, ClienteID)
            .input('Nombres', sql.NVarChar(100), Nombres || null)
            .input('ApellidoPaterno', sql.NVarChar(100), ApellidoPaterno || null)
            .input('ApellidoMaterno', sql.NVarChar(100), ApellidoMaterno || null)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .input('FechaNacimiento', sql.Date, FechaNacimiento || null)
            .execute('sp_ActualizarClientePersona');

        res.json({
            success: true,
            message: 'Cliente persona actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en actualizarClientePersona:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar cliente persona'
        });
    }
};

const actualizarClienteEmpresa = async (req, res) => {
    try {
        const {
            ClienteID,
            RazonSocial,
            NombreComercial,
            Telefono
        } = req.body;

        const pool = await getConnection();
        const result = await pool.request()
            .input('ClienteID', sql.Int, ClienteID)
            .input('RazonSocial', sql.NVarChar(255), RazonSocial || null)
            .input('NombreComercial', sql.NVarChar(255), NombreComercial || null)
            .input('Telefono', sql.NVarChar(20), Telefono || null)
            .execute('sp_ActualizarClienteEmpresa');

        res.json({
            success: true,
            message: 'Cliente empresa actualizado exitosamente',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Error en actualizarClienteEmpresa:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar cliente empresa'
        });
    }
};

module.exports = {
    crearClientePersona,
    crearClienteEmpresa,
    actualizarClientePersona,
    actualizarClienteEmpresa
};