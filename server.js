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
      rolID: 2,
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

    let errorMessage = 'Error al registrar usuario';
    let statusCode = 500;

    if (err.originalError && err.originalError.info && err.originalError.info.message) {
      errorMessage = err.originalError.info.message;
      statusCode = 400;
    } else if (err.message) {
      errorMessage = err.message;
      statusCode = 400;
    }

    res.status(statusCode).json({ error: errorMessage });
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


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Ejecutamos el SP
    const result = await sqlPool.request()
      .input('Email', sql.NVarChar(100), email)
      .execute('sp_LoginUsuario');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = result.recordset[0];

    // Validamos contraseña
    const isValidPassword = await bcrypt.compare(password, usuario.PasswordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Creamos token (base64 simple)
    const token = Buffer.from(JSON.stringify({
      usuarioID: usuario.UsuarioID,
      timestamp: Date.now()
    })).toString('base64');

    // Respondemos con usuario y token
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

app.get('/api/perfil', authenticateToken, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('Email', sql.NVarChar(100), req.user.Email)
      .execute('sp_ObtenerPerfilUsuario');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Perfil de usuario no encontrado.' });
    }

    const userData = result.recordset[0];

    const formattedData = {
      nombre: userData.NombreDisplay,
      email: userData.Email,
      telefono: userData.Telefono,
      direccion: userData.DireccionID ? {
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

app.put('/api/perfil/direccion', authenticateToken, async (req, res) => {
  const { DireccionID, NombreDireccion, Calle, Zona, CiudadID, Referencia, EsPrincipal } = req.body;
  if (!NombreDireccion || !Calle || !CiudadID) {
    return res.status(400).json({ error: 'Los campos Nombre de Dirección, Calle y Ciudad son requeridos.' });
  }

  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .input('DireccionID', sql.Int, DireccionID || null)
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

app.get('/api/vehiculos/modelos/:marcaID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('MarcaID', sql.Int, req.params.marcaID)
      .execute('sp_ObtenerModelosVehiculos');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo modelos:', err);
    res.status(500).json({ error: 'Error al obtener modelos' });
  }
});

app.get('/api/vehiculos/anios/:modeloID', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ModeloVehiculoID', sql.Int, req.params.modeloID)
      .execute('sp_ObtenerAniosVehiculo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo años:', err);
    res.status(500).json({ error: 'Error al obtener años' });
  }
});

// =============================================
// RUTAS DE PRODUCTOS
// =============================================

app.get('/api/productos/compatibles/:modeloID/:anio', async (req, res) => {
  try {
    const { modeloID, anio } = req.params;

    const result = await sqlPool.request()
      .input('ModeloVehiculoID', sql.Int, modeloID)
      .input('Anio', sql.Int, anio)
      .execute('sp_ObtenerLlantasCompatibles');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos compatibles:', err);
    res.status(500).json({ error: 'Error al obtener productos compatibles' });
  }
});

app.get('/api/productos/destacados', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerProductosDestacados');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos destacados:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


app.get('/api/productos', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerProductosCatalogo');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos del catálogo:', err);
    res.status(500).json({ error: 'No se pudo cargar el catálogo de productos.' });
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
    const productoIdNum = parseInt(productoID, 10);

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
      .execute('sp_ObtenerDireccionesCliente');

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
// RUTAS DE VENTAS (CLIENTE)
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
      .execute('sp_HistorialVentasCliente');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});


app.get('/api/ventas/:ventaID', authenticateToken, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('VentaID', sql.Int, req.params.ventaID)
      .input('ClienteID', sql.Int, req.user.ClienteID)
      .execute('sp_DetalleVenta');

    if (result.recordsets[0].length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({
      venta: result.recordsets[0][0],
      detalles: result.recordsets[1]
    });
  } catch (err) {
    console.error('Error obteniendo detalle de venta:', err);
    res.status(500).json({ error: 'Error al obtener detalle' });
  }
});




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

// =============================================
// ADMINISTRACIÓN - VENTAS
// =============================================

app.get('/api/admin/ventas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT * FROM vw_HistorialVentasAdmin ORDER BY FechaVenta DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo ventas:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

app.get('/api/admin/ventas/:ventaID/detalle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ventaID } = req.params;

    const result = await sqlPool.request()
      .input('VentaID', sql.Int, ventaID)
      .execute('sp_ObtenerDetalleVentaAdmin');

    const venta = result.recordsets[0][0];
    const productos = result.recordsets[1];
    const historial = result.recordsets[2] || [];

    if (!venta) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({ venta, productos, historial });
  } catch (err) {
    console.error('Error obteniendo detalle de venta:', err);
    res.status(500).json({ error: 'Error al obtener detalle de venta' });
  }
});

app.patch('/api/admin/ventas/:ventaID/estado', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ventaID } = req.params;
    const { estadoID, observaciones } = req.body;

    if (!estadoID) {
      return res.status(400).json({ error: 'El estadoID es requerido' });
    }

    const result = await sqlPool.request()
      .input('VentaID', sql.Int, ventaID)
      .input('NuevoEstadoID', sql.Int, estadoID)
      .input('UsuarioID', sql.Int, req.user.UsuarioID)
      .input('Comentario', sql.NVarChar(500), observaciones || null)
      .execute('sp_CambiarEstadoVenta');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({
      success: true,
      message: 'Estado de venta actualizado correctamente',
      venta: result.recordset[0]
    });
  } catch (err) {
    console.error('Error actualizando estado de venta:', err);
    res.status(500).json({ error: 'Error al actualizar estado de venta' });
  }
});

app.get('/api/admin/estados-pedido', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT EstadoID, NombreEstado, Descripcion, Orden FROM EstadosPedido ORDER BY Orden');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo estados:', err);
    res.status(500).json({ error: 'Error al obtener estados' });
  }
});

app.patch('/api/admin/ventas/:ventaID/seguimiento', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ventaID } = req.params;
    const { codigoSeguimiento } = req.body;

    if (!codigoSeguimiento) {
      return res.status(400).json({ error: 'El código de seguimiento es requerido' });
    }

    const result = await sqlPool.request()
      .input('VentaID', sql.Int, ventaID)
      .input('CodigoSeguimiento', sql.NVarChar(100), codigoSeguimiento)
      .query('UPDATE Ventas SET CodigoSeguimiento = @CodigoSeguimiento WHERE VentaID = @VentaID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    res.json({ success: true, message: 'Código de seguimiento actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando código de seguimiento:', err);
    res.status(500).json({ error: 'Error al actualizar código de seguimiento' });
  }
});

app.get('/api/admin/ventas/buscar', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { termino } = req.query;

    if (!termino || termino.length < 3) {
      return res.status(400).json({ error: 'El término de búsqueda debe tener al menos 3 caracteres' });
    }

    const result = await sqlPool.request()
      .input('Termino', sql.NVarChar(100), `%${termino}%`)
      .query(`
        SELECT * FROM vw_HistorialVentasAdmin
        WHERE NumeroFactura LIKE @Termino
           OR NombreCliente LIKE @Termino
           OR NumeroDocumento LIKE @Termino
        ORDER BY FechaVenta DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error buscando ventas:', err);
    res.status(500).json({ error: 'Error al buscar ventas' });
  }
});

app.get('/api/admin/ventas/rango', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fechaInicio y fechaFin' });
    }

    const result = await sqlPool.request()
      .input('FechaInicio', sql.Date, fechaInicio)
      .input('FechaFin', sql.Date, fechaFin)
      .query(`
        SELECT * FROM vw_HistorialVentasAdmin
        WHERE CAST(FechaVenta AS DATE) BETWEEN @FechaInicio AND @FechaFin
        ORDER BY FechaVenta DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo ventas por rango:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// =============================================
// ADMINISTRACIÓN - ESTADÍSTICAS
// =============================================

app.get('/api/admin/stats/ventas-hoy', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT 
          COUNT(*) AS CantidadVentasHoy,
          COALESCE(SUM(TotalVentaBs), 0) AS TotalVentasHoy
        FROM Ventas
        WHERE CAST(FechaVenta AS DATE) = CAST(GETDATE() AS DATE)
      `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo ventas de hoy:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de ventas' });
  }
});

app.get('/api/admin/stats/ventas-mes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('Mes', sql.Int, 12)   // opcional, por ejemplo diciembre
      .input('Anio', sql.Int, 2025) // opcional
      .execute('sp_ObtenerVentasMes');

    res.json(result.recordset[0]);

  } catch (err) {
    console.error('Error obteniendo ventas del mes:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de ventas' });
  }
});

app.get('/api/admin/stats/productos-total', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT COUNT(*) AS TotalProductos FROM Productos WHERE Activo = 1');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo total de productos:', err);
    res.status(500).json({ error: 'Error al obtener el total de productos.' });
  }
});

app.get('/api/admin/stats/clientes-total', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query('SELECT COUNT(*) AS TotalClientes FROM Clientes');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error obteniendo total de clientes:', err);
    res.status(500).json({ error: 'Error al obtener el total de clientes.' });
  }
});

// =============================================
// ADMINISTRACIÓN - REPORTES
// =============================================
app.get('/api/admin/reportes/productos-mas-vendidos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT TOP 20 *
        FROM vw_ProductosMasVendidos
        WHERE AñoVenta = YEAR(GETDATE()) AND MesVenta = MONTH(GETDATE())
        ORDER BY CantidadVendida DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos más vendidos:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});


app.get('/api/admin/reportes/ventas-diarias', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT TOP 30 *
        FROM vw_VentasDiarias
        ORDER BY Fecha DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});


app.get('/api/admin/reportes/stock-bajo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT * 
        FROM vw_StockBajo
        ORDER BY StockActual ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});


app.get('/api/admin/reportes/ventas-ciudad', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT * 
        FROM vw_VentasPorCiudad
        ORDER BY TotalVentasBs DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo reporte:', err);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});


// =============================================
// ADMINISTRACIÓN - PRODUCTOS
// =============================================

app.get('/api/admin/productos', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .query(`
        SELECT *
        FROM vw_ProductosAdmin
        WHERE Activo = 1
        ORDER BY ProductoID DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});


app.get('/api/admin/productos/:id', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ProductoID', sql.Int, req.params.id)
      .query(`
        SELECT *
        FROM vw_ProductosAdmin
        WHERE ProductoID = @ProductoID
          AND Activo = 1
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


app.post('/api/admin/productos', async (req, res) => {
  try {
    const {
      CodigoProducto, NombreProducto, Descripcion, CategoriaID, MarcaID,
      PrecioCompraBs, PrecioVentaBs, StockActual, StockMinimo,
      Ancho, Perfil, DiametroRin, IndiceCarga, IndiceVelocidad,
      Destacado, UsuarioID
    } = req.body;

    if (!CodigoProducto || !NombreProducto || PrecioCompraBs === undefined ||
      PrecioVentaBs === undefined || StockActual === undefined ||
      StockMinimo === undefined || Destacado === undefined || UsuarioID === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para el producto.' });
    }

    const request = sqlPool.request();

    request.input('CodigoProducto', sql.NVarChar(50), CodigoProducto);
    request.input('NombreProducto', sql.NVarChar(200), NombreProducto);
    request.input('Descripcion', sql.NVarChar(1000), Descripcion);
    request.input('CategoriaID', sql.Int, CategoriaID || null);
    request.input('MarcaID', sql.Int, MarcaID || null);
    request.input('PrecioCompraBs', sql.Decimal(10, 2), PrecioCompraBs);
    request.input('PrecioVentaBs', sql.Decimal(10, 2), PrecioVentaBs);
    request.input('StockActual', sql.Int, StockActual);
    request.input('StockMinimo', sql.Int, StockMinimo);
    request.input('Ancho', sql.Int, Ancho || null);
    request.input('Perfil', sql.Int, Perfil || null);
    request.input('DiametroRin', sql.Int, DiametroRin || null);
    request.input('IndiceCarga', sql.NVarChar(10), IndiceCarga || null);
    request.input('IndiceVelocidad', sql.NVarChar(5), IndiceVelocidad || null);
    request.input('Destacado', sql.Bit, Destacado);
    request.input('UsuarioID', sql.Int, UsuarioID);

    const result = await request.execute('sp_CrearOActualizarProducto2');

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

app.delete('/api/admin/productos/:id', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input('ProductoID', sql.Int, req.params.id)
      .query('UPDATE Productos SET Activo = 0 WHERE ProductoID = @ProductoID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// =============================================
// ADMINISTRACIÓN - CLIENTES
// =============================================

app.get('/api/admin/clientes', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerClientesAdmin');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo clientes:', err);
    res.status(500).json({ error: 'Error al cargar la lista de clientes.' });
  }
});

app.get('/api/admin/clientes/:clienteID/historial', async (req, res) => {
  const clienteID = req.params.clienteID;
  try {
    const result = await sqlPool.request()
      .input('ClienteID', sql.Int, clienteID)
      .execute('sp_ObtenerHistorialVentasCliente');
    res.json(result.recordset);
  } catch (err) {
    console.error(`Error obteniendo historial para ClienteID ${clienteID}:`, err);
    res.status(500).json({ error: 'Error al cargar el historial de ventas.' });
  }
});

// =============================================
// ADMINISTRACIÓN - CATEGORÍAS Y MARCAS
// =============================================

app.get('/api/admin/categorias', async (req, res) => {
  try {
    const result = await sqlPool.request()
      .execute('sp_ObtenerCategoriasConProductos');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error obteniendo categorías:', err);
    res.status(500).json({ error: 'Error al obtener la lista de categorías.' });
  }
});

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