const { getConnection, sql } = require('../config/database');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('Email', sql.NVarChar(100), email)
            .query(`
        SELECT 
          u.UsuarioID, 
          u.Email, 
          u.PasswordHash, 
          u.RolID,
          r.NombreRol,
          c.ClienteID,
          c.TipoCliente,
          CASE 
            WHEN c.TipoCliente = 'Persona' THEN p.Nombres + ' ' + p.ApellidoPaterno
            ELSE e.RazonSocial
          END AS NombreCompleto
        FROM Usuarios u
        INNER JOIN Roles r ON u.RolID = r.RolID
        LEFT JOIN Clientes c ON u.UsuarioID = c.UsuarioID
        LEFT JOIN Personas p ON c.ClienteID = p.ClienteID AND c.TipoCliente = 'Persona'
        LEFT JOIN Empresas e ON c.ClienteID = e.ClienteID AND c.TipoCliente = 'Empresa'
        WHERE u.Email = @Email AND u.Activo = 1
      `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = result.recordset[0];
        const isValidPassword = await bcrypt.compare(password, usuario.PasswordHash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = Buffer.from(JSON.stringify({
            usuarioID: usuario.UsuarioID,
            timestamp: Date.now()
        })).toString('base64');

        res.json({
            success: true,
            token,
            usuario: {
                usuarioID: usuario.UsuarioID,
                clienteID: usuario.ClienteID,
                email: usuario.Email,
                nombre: usuario.NombreCompleto,
                rol: usuario.NombreRol,
                rolID: usuario.RolID,
                tipoCliente: usuario.TipoCliente
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

module.exports = { login };
