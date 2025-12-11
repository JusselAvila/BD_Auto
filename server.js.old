const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// =============================================
// CONFIGURACIÓN SQL SERVER
// =============================================
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let sqlPool;

// =============================================
// CONFIGURACIÓN MONGODB (CARRITOS TEMPORALES)
// =============================================
const mongoURI = process.env.MONGO_URI;

const carritoSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  items: [{
    productoID: { type: Number, required: true },
    nombre: String,
    precio: Number,
    cantidad: { type: Number, required: true },
    subtotal: Number
  }],
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const CarritoTemporal = mongoose.model('CarritoTemporal', carritoSchema);

// =============================================
// CONEXIÓN A BASES DE DATOS
// =============================================
async function connectDatabases() {
  try {
    sqlPool = await sql.connect(sqlConfig);
    console.log('✅ Conectado a SQL Server');

    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a las bases de datos:', err);
    process.exit(1);
  }
}

// =============================================
// MIDDLEWARE DE AUTENTICACIÓN
// =============================================
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

    const result = await sqlPool.request()
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

// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================

// Registro Persona
app.post('/api/registro/persona', async (req, res) => {
  try {
    const { email, password, nombres, apellidoPaterno, apellidoMaterno, ci, telefono, fechaNacimiento } = req.body;

    if (!email || !password || !nombres || !apellidoPaterno || !ci) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sqlPool.request()
      .input('Email', sql.NVarChar(100), email)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Nombres', sql.NVarChar(100), nombres)
      .input('ApellidoPaterno', sql.NVarChar(100), apellidoPaterno)
      .input('ApellidoMaterno', sql.NVarChar(100), apellidoMaterno || null)
      .input('CI', sql.NVarChar(20), ci)
      .input('Telefono', sql.NVarChar(20), telefono || null)
      .input('FechaNacimiento', sql.Date, fechaNacimiento || null)
      .execute('sp_CrearClientePersona');

    const { UsuarioID, ClienteID } = result.recordset[0];

    const token = Buffer.from(JSON.stringify({
      usuarioID: UsuarioID,
      timestamp: Date.now()
    })).toString('base64');
    
    const usuario = {
        usuarioID: UsuarioID,
        clienteID: ClienteID,
        email: email,
        nombre: `${nombres} ${apellidoPaterno}`,
        rol: 'Cliente',
        rolID: 2, // Assuming 2 is the RolID for Cliente
        tipoCliente: 'Persona'
    };

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      usuario
    });
  } catch (err) {
    console.error('Error en registro persona:', err);
    if (err.message.includes('ya está registrado')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Registro Empresa
app.post('/api/registro/empresa', async (req, res) => {
  try {
    const { email, password, razonSocial, nombreComercial, nit, telefono } = req.body;

    if (!email || !password || !razonSocial || !nit) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await sqlPool.request()
      .input('Email', sql.NVarChar(100), email)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('RazonSocial', sql.NVarChar(255), razonSocial)
      .input('NombreComercial', sql.NVarChar(255), nombreComercial || null)
      .input('NIT', sql.NVarChar(20), nit)
      .input('Telefono', sql.NVarChar(20), telefono || null)
      .execute('sp_CrearClienteEmpresa');

    const { UsuarioID, ClienteID } = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Empresa registrada exitosamente',
      usuarioID: UsuarioID,
      clienteID: ClienteID
    });
  } catch (err) {
    console.error('Error en registro empresa:', err);
    if (err.message.includes('ya está registrado')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al registrar empresa' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await sqlPool.request()
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
});

// =============================================
// RUTAS DE PERFIL DE USUARIO
// =============================================

// Obtener perfil completo del usuario (datos personales + dirección)
app.get('/api/perfil', authenticateToken, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('Email', sql.NVarChar(100), req.user.Email) // Cambiado a Email
      .execute('sp_ObtenerPerfilUsuario'); 
    
    if (result.recordset.length === 0) {
        return res.status(404).json({ error: 'Perfil de usuario no encontrado.' });
    }

    const userData = result.recordset[0];

    const formattedData = {
      nombre: userData.NombreDisplay, // Usando el campo correcto del SP
      email: userData.Email,
      telefono: userData.Telefono, 
      direccion: userData.DireccionID ? { // Solo incluir dirección si existe
          DireccionID: userData.DireccionID,
          NombreDireccion: userData.NombreDireccion,
          Calle: userData.Calle,
          Zona: userData.Zona,
          CiudadID: userData.CiudadID,
          NombreCiudad: userData.NombreCiudad,
          DepartamentoID: userData.DepartamentoID,
          NombreDepartamento: userData.NombreDepartamento,
          Referencia: userData.Referencia,
          EsPrincipal: userData.EsPrincipal
      } : null
    };
    res.json(formattedData);

  } catch (err) {
    console.error('Error obteniendo perfil de usuario:', err);
    res.status(500).json({ error: 'Error al obtener el perfil del usuario.' });
  }
});

// Actualizar información personal del usuario
app.put('/api/perfil/usuario', authenticateToken, async (req, res) => {
  const { nombre, telefono } = req.body; 
  if (!nombre) {
    return res.status(400).json({ error: 'El campo nombre es requerido.' });
  }

  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .input('Nombres', sql.NVarChar(100), nombre) 
      .input('ApellidoPaterno', sql.NVarChar(100), null)
      .input('ApellidoMaterno', sql.NVarChar(100), null)
      .input('Telefono', sql.NVarChar(20), telefono || null) 
      .input('FechaNacimiento', sql.Date, null)
      .execute('sp_ActualizarClientePersona'); 
    
    res.json({ success: true, message: 'Información personal actualizada con éxito.', data: result.recordset[0] });

  } catch (err) {
    console.error('Error actualizando perfil de usuario:', err);
    res.status(500).json({ error: 'Error al actualizar la información personal.' });
  }
});

// Crear o actualizar la dirección del usuario
app.put('/api/perfil/direccion', authenticateToken, async (req, res) => {
    const { DireccionID, NombreDireccion, Calle, Zona, CiudadID, Referencia, EsPrincipal } = req.body;
    if (!NombreDireccion || !Calle || !CiudadID) {
        return res.status(400).json({ error: 'Los campos Nombre de Dirección, Calle y Ciudad son requeridos.' });
    }

    try {
        const result = await sqlPool.request()
            .input('ClienteID', sql.Int, req.user.ClienteID)
            .input('DireccionID', sql.Int, DireccionID || null) // Puede ser NULL para crear nueva
            .input('NombreDireccion', sql.NVarChar(50), NombreDireccion)
            .input('Calle', sql.NVarChar(255), Calle)
            .input('Zona', sql.NVarChar(100), Zona || null) 
            .input('CiudadID', sql.Int, CiudadID) 
            .input('Referencia', sql.NVarChar(255), Referencia || null)
            .input('EsPrincipal', sql.Bit, EsPrincipal) 
            .execute('sp_ActualizarCrearDireccion');

        res.json({ success: true, message: 'Dirección actualizada con éxito.', data: result.recordset[0] });

    } catch (err) {
        console.error('Error actualizando la dirección:', err);
        res.status(500).json({ error: 'Error al actualizar la dirección.' });
    }
});


// =============================================
// RUTAS DE GEOGRAFÍA (BOLIVIA)
// =============================================

// Obtener departamentos
app.get('/api/departamentos', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT DepartamentoID, NombreDepartamento FROM Departamentos ORDER BY NombreDepartamento');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo departamentos:', err);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

// Obtener ciudades por departamento
app.get('/api/ciudades/:departamentoID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('DepartamentoID', sql.Int, req.params.departamentoID)
      .query('SELECT CiudadID, NombreCiudad FROM Ciudades WHERE DepartamentoID = @DepartamentoID ORDER BY NombreCiudad');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo ciudades:', err);
    res.status(500).json({ error: 'Error al obtener ciudades' });
  }
});

// =============================================
// RUTAS DE VEHÍCULOS
// =============================================

// Obtener marcas de vehículos
app.get('/api/vehiculos/marcas', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerMarcasVehiculos');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo marcas:', err);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Obtener modelos por marca
app.get('/api/vehiculos/modelos/:marcaID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('MarcaVehiculoID', sql.Int, req.params.marcaID)
      .execute('sp_ObtenerModelosVehiculo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo modelos:', err);
    res.status(500).json({ error: 'Error al obtener modelos' });
  }
});

// Obtener versiones por modelo
app.get('/api/vehiculos/versiones/:modeloID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ModeloID', sql.Int, req.params.modeloID)
      .query('SELECT VersionVehiculoID, NombreVersion, Anio FROM Vehiculo_Versiones WHERE ModeloVehiculoID = @ModeloID ORDER BY Anio DESC, NombreVersion');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo versiones:', err);
    res.status(500).json({ error: 'Error al obtener versiones' });
  }
});

// =============================================
// RUTAS DE PRODUCTOS
// =============================================

// Obtener productos compatibles con versión de vehículo
app.get('/api/productos/compatibles/:versionID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('VersionID', sql.Int, req.params.versionID)
      .query(`
        SELECT DISTINCT
          p.ProductoID,
          p.CodigoProducto,
          p.NombreProducto,
          p.Descripcion,
          p.PrecioVentaBs,
          p.StockActual,
          p.Ancho,
          p.Perfil,
          p.DiametroRin,

          c.NombreCategoria,
          m.NombreMarca,
          lc.Posicion,
          lc.Observacion
        FROM Productos p
        INNER JOIN Llantas_Compatibilidad lc ON p.ProductoID = lc.ProductoID
        INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
        INNER JOIN Marcas m ON p.MarcaID = m.MarcaID
        WHERE lc.VersionVehiculoID = @VersionID 
          AND p.Activo = 1 
          AND p.StockActual > 0
        ORDER BY c.NombreCategoria, p.NombreProducto
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos compatibles:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener productos destacados
app.get('/api/productos/destacados', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT TOP 10
          p.ProductoID,
          p.CodigoProducto,
          p.NombreProducto,
          p.Descripcion,
          p.PrecioVentaBs,
          p.StockActual,
          c.NombreCategoria,
          m.NombreMarca
        FROM Productos p
        INNER JOIN Categorias c ON p.CategoriaID = c.CategoriaID
        INNER JOIN Marcas m ON p.MarcaID = m.MarcaID
        WHERE p.Activo = 1 AND p.Destacado = 1 AND p.StockActual > 0
        ORDER BY p.ProductoID DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos destacados:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// =============================================
// RUTAS DE CARRITO (MONGODB)
// =============================================

app.get('/api/carrito/:sessionId', async (req, res) => {
  try {
    let carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

    if (!carrito) {
      carrito = await CarritoTemporal.create({
        sessionId: req.params.sessionId,
        items: [],
        total: 0
      });
    }

    res.json(carrito);
  } catch (err) {
    console.error('Error obteniendo carrito:', err);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

app.post('/api/carrito/:sessionId/agregar', async (req, res) => {
  try {
    const { productoID, cantidad } = req.body;

    if (!productoID || !cantidad || cantidad < 1) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const productoResult = await sqlPool.request()
      .input('ProductoID', sql.Int, productoID)
      .query('SELECT ProductoID, NombreProducto, PrecioVentaBs, StockActual FROM Productos WHERE ProductoID = @ProductoID AND Activo = 1');

    if (productoResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productoResult.recordset[0];

    if (producto.StockActual < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }

    let carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

    if (!carrito) {
      carrito = new CarritoTemporal({ sessionId: req.params.sessionId, items: [] });
    }

    const itemIndex = carrito.items.findIndex(item => item.productoID === productoID);

    if (itemIndex > -1) {
      carrito.items[itemIndex].cantidad += cantidad;
      carrito.items[itemIndex].subtotal = carrito.items[itemIndex].cantidad * carrito.items[itemIndex].precio;
    } else {
      carrito.items.push({
        productoID: producto.ProductoID,
        nombre: producto.NombreProducto,
        precio: producto.PrecioVentaBs,
        cantidad: cantidad,
        subtotal: producto.PrecioVentaBs * cantidad
      });
    }

    carrito.total = carrito.items.reduce((sum, item) => sum + item.subtotal, 0);
    await carrito.save();

    res.json(carrito);
  } catch (err) {
    console.error('Error agregando al carrito:', err);
    res.status(500).json({ error: 'Error al agregar producto' });
  }
});

app.put('/api/carrito/:sessionId/actualizar', async (req, res) => {
  try {
    const { productoID, cantidad } = req.body;
    const productoIdNum = parseInt(productoID, 10); // Asegurar que sea un número

    const carrito = await CarritoTemporal.findOne({ sessionId: req.params.sessionId });

    if (!carrito) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    if (cantidad === 0) {
      carrito.items = carrito.items.filter(item => item.productoID !== productoIdNum);
    } else {
      const itemIndex = carrito.items.findIndex(item => item.productoID === productoIdNum);

      if (itemIndex > -1) {
        carrito.items[itemIndex].cantidad = cantidad;
        carrito.items[itemIndex].subtotal = carrito.items[itemIndex].cantidad * carrito.items[itemIndex].precio;
      } else if (cantidad > 0) {
        // Opcional: si el item no se encuentra, no hacer nada o agregarlo. Por ahora no hacemos nada.
        console.warn(`Intento de actualizar producto ${productoIdNum} que no está en el carrito.`);
      }
    }

    carrito.total = carrito.items.reduce((sum, item) => sum + item.subtotal, 0);
    await carrito.save();

    res.json(carrito);
  } catch (err) {
    console.error('Error actualizando carrito:', err);
    res.status(500).json({ error: 'Error al actualizar carrito' });
  }
});

app.delete('/api/carrito/:sessionId', async (req, res) => {
  try {
    await CarritoTemporal.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { items: [], total: 0 },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Carrito vaciado' });
  } catch (err) {
    console.error('Error vaciando carrito:', err);
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

// =============================================
// RUTAS DE DIRECCIONES
// =============================================

app.get('/api/direcciones', authenticateToken, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .query(`
        SELECT 
          d.DireccionID,
          d.NombreDireccion,
          d.Calle,
          d.Zona,
          d.Referencia,
          d.EsPrincipal,
          c.NombreCiudad,
          dep.NombreDepartamento,
          d.CiudadID
        FROM Direcciones d
        INNER JOIN Ciudades c ON d.CiudadID = c.CiudadID
        INNER JOIN Departamentos dep ON c.DepartamentoID = dep.DepartamentoID
        WHERE d.ClienteID = @ClienteID AND d.Activo = 1
        ORDER BY d.EsPrincipal DESC, d.NombreDireccion
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo direcciones:', err);
    res.status(500).json({ error: 'Error al obtener direcciones' });
  }
});

app.post('/api/direcciones', authenticateToken, async (req, res) => {
  try {
    const { nombreDireccion, calle, zona, ciudadID, referencia, esPrincipal } = req.body;

    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .input('NombreDireccion', sql.NVarChar(50), nombreDireccion)
      .input('Calle', sql.NVarChar(255), calle)
      .input('Zona', sql.NVarChar(100), zona || null)
      .input('CiudadID', sql.Int, ciudadID)
      .input('Referencia', sql.NVarChar(255), referencia || null)
      .input('EsPrincipal', sql.Bit, esPrincipal || 0)
      .execute('sp_AgregarDireccion');

    res.status(201).json({
      success: true,
      direccionID: result.recordset[0].DireccionID
    });
  } catch (err) {
    console.error('Error agregando dirección:', err);
    if (err.message.includes('máximo de 3 direcciones')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al agregar dirección' });
  }
});

// =============================================
// RUTAS DE VENTAS
// =============================================

app.post('/api/ventas', authenticateToken, async (req, res) => {
  try {
    const { direccionEnvioID, metodoPagoID, cuponID, observaciones, sessionId } = req.body;

    const carrito = await CarritoTemporal.findOne({ sessionId });

    if (!carrito || carrito.items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const detallesJSON = JSON.stringify(
      carrito.items.map(item => ({
        ProductoID: item.productoID,
        Cantidad: item.cantidad
      }))
    );

    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .input('DireccionEnvioID', sql.Int, direccionEnvioID)
      .input('MetodoPagoID', sql.Int, metodoPagoID)
      .input('CuponID', sql.Int, cuponID || null)
      .input('Observaciones', sql.NVarChar(500), observaciones || null)
      .input('DetallesJSON', sql.NVarChar(sql.MAX), detallesJSON)
      .input('UsuarioID', sql.Int, req.user.UsuarioID)
      .execute('sp_CrearVenta');

    const venta = result.recordset[0];

    await CarritoTemporal.findOneAndUpdate(
      { sessionId },
      { items: [], total: 0 }
    );

    res.status(201).json({
      success: true,
      venta: {
        ventaID: venta.VentaID,
        numeroFactura: venta.NumeroFactura,
        totalVentaBs: venta.TotalVentaBs
      }
    });
  } catch (err) {
    console.error('Error creando venta:', err);
    if (err.message.includes('stock suficiente')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Error al procesar la venta' });
  }
});

app.get('/api/ventas/historial', authenticateToken, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .query(`
        SELECT 
          v.VentaID,
          v.NumeroFactura,
          v.FechaVenta,
          v.TotalVentaBs,
          ep.NombreEstado,
          mp.NombreMetodo AS MetodoPago,
          COUNT(dv.DetalleVentaID) AS CantidadProductos
        FROM Ventas v
        INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
        INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
        LEFT JOIN DetalleVentas dv ON v.VentaID = dv.VentaID
        WHERE v.ClienteID = @ClienteID
        GROUP BY v.VentaID, v.NumeroFactura, v.FechaVenta, v.TotalVentaBs, ep.NombreEstado, mp.NombreMetodo
        ORDER BY v.FechaVenta DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

app.get('/api/ventas/:ventaID', authenticateToken, async (req, res) => {
  try {
    const ventaResult = await sqlPool.request()
      .input('VentaID', sql.Int, req.params.ventaID)
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .query(`
        SELECT 
          v.*,
          ep.NombreEstado,
          mp.NombreMetodo AS MetodoPago,
          d.Calle + ', ' + d.Zona + ', ' + c.NombreCiudad AS DireccionCompleta
        FROM Ventas v
        INNER JOIN EstadosPedido ep ON v.EstadoID = ep.EstadoID
        INNER JOIN MetodosPago mp ON v.MetodoPagoID = mp.MetodoPagoID
        INNER JOIN Direcciones d ON v.DireccionEnvioID = d.DireccionID
        INNER JOIN Ciudades c ON d.CiudadID = c.CiudadID
        WHERE v.VentaID = @VentaID AND v.ClienteID = @ClienteID
      `);

    if (ventaResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const detalleResult = await sqlPool.request()
      .input('VentaID', sql.Int, req.params.ventaID)
      .query(`
        SELECT 
          dv.*,
          p.NombreProducto,
          p.CodigoProducto
        FROM DetalleVentas dv
        INNER JOIN Productos p ON dv.ProductoID = p.ProductoID
        WHERE dv.VentaID = @VentaID
      `);

    res.json({
      venta: ventaResult.recordset[0],
      detalles: detalleResult.recordset
    });
  } catch (err) {
    console.error('Error obteniendo detalle de venta:', err);
    res.status(500).json({ error: 'Error al obtener detalle' });
  }
});

// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

// Nuevos endpoints para estadísticas del dashboard
app.get('/api/admin/stats/productos-total', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request().execute('sp_ContarProductosActivos');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo total de productos:', err);
    res.status(500).json({ error: 'Error al obtener el total de productos.' });
  }
});

app.get('/api/admin/stats/clientes-total', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request().execute('sp_ContarClientes');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo total de clientes:', err);
    res.status(500).json({ error: 'Error al obtener el total de clientes.' });
  }
});

app.get('/api/admin/stats/ventas-mes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request().execute('sp_ObtenerVentasDelMes');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo ventas del mes:', err);
    res.status(500).json({ error: 'Error al obtener las ventas del mes.' });
  }
});

app.get('/api/admin/stats/ventas-hoy', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request().execute('SP_CantidadVentasHoy');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo transacciones de ventas de hoy:', err);
    res.status(500).json({ error: 'Error al obtener las transacciones de ventas de hoy.' });
  }
});

app.get('/api/admin/ventas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT * FROM vw_HistorialComprasCliente ORDER BY FechaVenta DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo ventas:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

app.get('/api/admin/reportes/ventas-diarias', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT TOP 30 * FROM vw_VentasDiarias ORDER BY Fecha DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

app.get('/api/admin/reportes/productos-mas-vendidos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT TOP 20 * FROM vw_ProductosMasVendidos ORDER BY CantidadVendida DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

app.get('/api/admin/reportes/stock-bajo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT * FROM vw_ProductosStockBajo ORDER BY StockActual ASC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

app.get('/api/admin/reportes/ventas-ciudad', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT * FROM vw_VentasPorCiudad ORDER BY TotalVentasBs DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

// =============================================
// OBTENER MÉTODOS DE PAGO
// =============================================

app.get('/api/metodos-pago', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT MetodoPagoID, NombreMetodo, Descripcion FROM MetodosPago WHERE Activo = 1 ORDER BY MetodoPagoID');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo métodos de pago:', err);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerProductosCatalogo');

    // Los resultados ya están filtrados por la VIEW y el SP
    res.json(result.recordset);

  } catch (err) {
    console.error('Error obteniendo productos del catálogo:', err);
    // Usamos 500 para error interno del servidor
    res.status(500).json({ error: 'No se pudo cargar el catálogo de productos.' });
  }
});


app.get('/api/admin/categorias', async (req, res) => {
  // [Aquí debe ir su middleware de checkAdminAuth]
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerCategoriasConProductos');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo todas las categorías:', err);
    res.status(500).json({ error: 'Error al obtener la lista de categorías.' });
  }
});


// En server.js

// 1. ENDPOINT PARA CARGAR LA TABLA PRINCIPAL DE CLIENTES
app.get('/api/admin/clientes', async (req, res) => {
  // Middleware de seguridad
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerClientesAdmin');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo clientes para admin:', err);
    res.status(500).json({ error: 'Error al cargar la lista de clientes.' });
  }
});

// 2. ENDPOINT PARA CARGAR EL HISTORIAL DE UN CLIENTE ESPECÍFICO
app.get('/api/admin/clientes/:clienteID/historial', async (req, res) => {
  // Middleware de seguridad
  const clienteID = req.params.clienteID;
  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, clienteID) // Pasa el parámetro al SP
      .execute('sp_ObtenerHistorialVentasCliente');
    res.json(result.recordset);
  } catch (err) {
    console.error(`Error obteniendo historial para ClienteID ${clienteID}:`, err);
    res.status(500).json({ error: 'Error al cargar el historial de ventas.' });
  }
});

app.post('/api/admin/productos', async (req, res) => {
  // NOTA: Aquí debería haber un middleware de autenticación y autorización (Admin)
  try {
    const {
      CodigoProducto, NombreProducto, Descripcion, CategoriaID, MarcaID,
      PrecioCompraBs, PrecioVentaBs, StockActual, StockMinimo,
      Ancho, Perfil, DiametroRin, IndiceCarga, IndiceVelocidad,
      Destacado, UsuarioID
    } = req.body;

    // Validación básica de campos obligatorios
    if (!CodigoProducto || !NombreProducto || PrecioCompraBs === undefined || PrecioVentaBs === undefined || StockActual === undefined || StockMinimo === undefined || Destacado === undefined || UsuarioID === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para el producto.' });
    }

    const request = sqlPool.request();

    // Mapeo de parámetros al Stored Procedure
    request.input('CodigoProducto', sql.NVarChar(50), CodigoProducto);
    request.input('NombreProducto', sql.NVarChar(200), NombreProducto);
    request.input('Descripcion', sql.NVarChar(1000), Descripcion);

    // IDs opcionales (pueden ser NULL)
    request.input('CategoriaID', sql.Int, CategoriaID || null);
    request.input('MarcaID', sql.Int, MarcaID || null);

    // Valores numéricos
    request.input('PrecioCompraBs', sql.Decimal(10, 2), PrecioCompraBs);
    request.input('PrecioVentaBs', sql.Decimal(10, 2), PrecioVentaBs);
    request.input('StockActual', sql.Int, StockActual);
    request.input('StockMinimo', sql.Int, StockMinimo);

    // Parámetros de Llanta (opcionales - INT y NVARCHAR)
    request.input('Ancho', sql.Int, Ancho || null);
    request.input('Perfil', sql.Int, Perfil || null);
    request.input('DiametroRin', sql.Int, DiametroRin || null);
    request.input('IndiceCarga', sql.NVarChar(10), IndiceCarga || null);
    request.input('IndiceVelocidad', sql.NVarChar(5), IndiceVelocidad || null);

    // Parámetros Adicionales
    request.input('Destacado', sql.Bit, Destacado);
    request.input('UsuarioID', sql.Int, UsuarioID); // Asumiendo que el ID del usuario que realiza el cambio se pasa

    // Ejecutar el procedimiento
    const result = await request.execute('sp_CrearOActualizarProducto2');

    // El SP devuelve el ProductoID y la Operacion ('CREADO' o 'ACTUALIZADO')
    const productoInfo = result.recordset[0];

    res.status(200).json({
      message: `Producto ${productoInfo.Operacion.toLowerCase()} con éxito.`,
      productoID: productoInfo.ProductoID,
      operacion: productoInfo.Operacion
    });

  } catch (err) {
    console.error('Error al crear/actualizar producto:', err);
    res.status(500).json({ error: 'Error en el servidor al procesar la solicitud del producto.' });
  }
});

// Obtener todos los productos (Admin)
app.get('/api/admin/productos', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT 
          p.ProductoID,
          p.CodigoProducto,
          p.NombreProducto,
          p.Descripcion,
          p.CategoriaID,
          c.NombreCategoria,
          p.MarcaID,
          m.NombreMarca,
          p.PrecioCompraBs,
          p.PrecioVentaBs,
          p.StockActual,
          p.StockMinimo,
          p.Ancho,
          p.Perfil,
          p.DiametroRin,
          p.IndiceCarga,
          p.IndiceVelocidad,
          p.Destacado,
          p.Activo
        FROM Productos p
        LEFT JOIN Categorias c ON p.CategoriaID = c.CategoriaID
        LEFT JOIN Marcas m ON p.MarcaID = m.MarcaID
        WHERE p.Activo = 1
        ORDER BY p.ProductoID DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto específico (Admin)
app.get('/api/admin/productos/:id', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ProductoID', sql.Int, req.params.id)
      .query(`
        SELECT 
          p.ProductoID,
          p.CodigoProducto,
          p.NombreProducto,
          p.Descripcion,
          p.CategoriaID,
          p.MarcaID,
          p.PrecioCompraBs,
          p.PrecioVentaBs,
          p.StockActual,
          p.StockMinimo,
          p.Ancho,
          p.Perfil,
          p.DiametroRin,
          p.IndiceCarga,
          p.IndiceVelocidad,
          p.Destacado
        FROM Productos p
        WHERE p.ProductoID = @ProductoID AND p.Activo = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo producto:', err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Eliminar producto (Admin) - Eliminación lógica
app.delete('/api/admin/productos/:id', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ProductoID', sql.Int, req.params.id)
      .query(`
        UPDATE Productos 
        SET Activo = 0 
        WHERE ProductoID = @ProductoID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// Obtener todas las marcas (Admin)
app.get('/api/admin/marcas', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT MarcaID, NombreMarca FROM Marcas WHERE Activo = 1 ORDER BY NombreMarca');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo marcas:', err);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});




app.get("/direcciones/departamentos", async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().execute("SP_ObtenerDepartamentos");

        res.json(result.recordset);
    } catch (err) {
        console.error("Error SP_ObtenerDepartamentos:", err);
        res.status(500).json({ error: "Error al obtener departamentos" });
    }
});

// ========================================
// 2. OBTENER CIUDADES POR DEPARTAMENTO
// ========================================
app.get("/direcciones/ciudades/:departamentoID", async (req, res) => {
    const { departamentoID } = req.params;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("DepartamentoID", sql.Int, departamentoID)
            .execute("SP_ObtenerCiudadesPorDepartamento");

        res.json(result.recordset);
    } catch (err) {
        console.error("Error SP_ObtenerCiudadesPorDepartamento:", err);
        res.status(500).json({ error: "Error al obtener ciudades" });
    }
});

// ========================================
// 3. OBTENER DIRECCIONES POR CLIENTE
// ========================================
app.get("/direcciones/cliente/:clienteID", async (req, res) => {
    const { clienteID } = req.params;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("ClienteID", sql.Int, clienteID)
            .execute("SP_ObtenerDireccionesPorCliente");

        res.json(result.recordset);
    } catch (err) {
        console.error("Error SP_ObtenerDireccionesPorCliente:", err);
        res.status(500).json({ error: "Error al obtener direcciones del cliente" });
    }
});

// ========================================
// 4. GUARDAR DIRECCION (CREAR o ACTUALIZAR)
// ========================================
app.post("/direcciones/guardar", async (req, res) => {
    const {
        DireccionID,
        ClienteID,
        NombreDireccion,
        Calle,
        Zona,
        CiudadID,
        Referencia,
        EsPrincipal
    } = req.body;

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input("DireccionID", sql.Int, DireccionID || null)
            .input("ClienteID", sql.Int, ClienteID)
            .input("NombreDireccion", sql.NVarChar(50), NombreDireccion)
            .input("Calle", sql.NVarChar(255), Calle)
            .input("Zona", sql.NVarChar(100), Zona)
            .input("CiudadID", sql.Int, CiudadID)
            .input("Referencia", sql.NVarChar(255), Referencia)
            .input("EsPrincipal", sql.Bit, EsPrincipal)
            .execute("SP_GuardarDireccion");

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Error SP_GuardarDireccion:", err);
        res.status(500).json({ error: "Error al guardar la dirección" });
    }
});

// ========================================
// 5. ELIMINAR DIRECCIÓN (soft delete)
// ========================================
app.delete("/direcciones/eliminar/:direccionID", async (req, res) => {
    const { direccionID } = req.params;

    try {
        const pool = await getPool();
        await pool.request()
            .input("DireccionID", sql.Int, direccionID)
            .execute("SP_EliminarDireccion");

        res.json({ mensaje: "Dirección eliminada correctamente" });
    } catch (err) {
        console.error("Error SP_EliminarDireccion:", err);
        res.status(500).json({ error: "Error al eliminar la dirección" });
    }
});






// =============================================
// INICIAR SERVIDOR
// =============================================
connectDatabases().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📍 Ubicación: Santa Cruz de la Sierra, Bolivia`);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
});

