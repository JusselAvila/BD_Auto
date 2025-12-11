const { getConnection, sql } = require('../config/database');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        const pool = await getConnection();

        const result = await pool.request()
            .input('UsuarioID', sql.Int, decoded.usuarioID)
            .query(`
        SELECT u.UsuarioID, u.Email, u.RolID, r.NombreRol, c.ClienteID
        FROM Usuarios u
        INNER JOIN Roles r ON u.RolID = r.RolID
        LEFT JOIN Clientes c ON u.UsuarioID = c.UsuarioID
        WHERE u.UsuarioID = @UsuarioID AND u.Activo = 1
      `);

        if (result.recordset.length === 0) {
            return res.status(403).json({ error: 'Token inválido' });
        }

        req.user = result.recordset[0];
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.RolID !== 1) {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
}

module.exports = { authenticateToken, requireAdmin };
