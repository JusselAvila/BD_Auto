// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Generar o recuperar sessionId
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getUsuario() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

function isAuthenticated() {
  return getAuthToken() !== null;
}

// =============================================
// CARGA INICIAL
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  const sessionId = getSessionId();
  
  actualizarHeaderUI();
  await cargarMarcas();
  await cargarProductosDestacados();
  await cargarCarrito();
  configurarEventos();
});

// =============================================
// ACTUALIZAR HEADER UI
// =============================================
function actualizarHeaderUI() {
  const usuario = getUsuario();
  const headerActions = document.querySelector('.header-actions');
  
  if (usuario) {
    headerActions.innerHTML = `
      <span class="user-name">¡Hola, ${usuario.nombre}! 👋</span>
      <button id="btn-carrito" class="btn-login">
        🛒 Carrito <span id="cart-count" class="cart-count">0</span>
      </button>
      <button id="btn-mis-compras" class="btn-login">📦 Mis Compras</button>
      ${usuario.rolID === 1 ? '<button id="btn-admin" class="btn-login">⚙️ Admin</button>' : ''}
      <button id="btn-logout" class="btn-login">🚪 Cerrar Sesión</button>
    `;
    
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
    
    document.getElementById('btn-carrito').addEventListener('click', mostrarCarrito);
    document.getElementById('btn-mis-compras').addEventListener('click', () => {
      window.location.href = 'historial.html';
    });
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
    
    if (usuario.rolID === 1) {
      document.getElementById('btn-admin').addEventListener('click', () => {
        window.location.href = 'admin.html';
      });
    }
  } else {
    const btnCarrito = document.getElementById('btn-carrito');
    if (btnCarrito) {
      btnCarrito.addEventListener('click', mostrarCarrito);
    }
  }
  
  cargarCarrito();
}

function cerrarSesion() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

// =============================================
// CARGAR MARCAS DE VEHÍCULOS
// =============================================
async function cargarMarcas() {
  try {
    const response = await fetch(`${API_URL}/vehiculos/marcas`);
    const marcas = await response.json();
    
    const selectMarcas = document.getElementById('marcas');
    selectMarcas.innerHTML = '<option value="">Seleccione una marca</option>';
    
    marcas.forEach(marca => {
      const option = document.createElement('option');
      option.value = marca.MarcaVehiculoID;
      option.textContent = marca.Nombre;
      selectMarcas.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando marcas:', err);
    mostrarMensaje('Error al cargar marcas', 'error');
  }
}

// =============================================
// CONFIGURAR EVENTOS
// =============================================
function configurarEventos() {
  const selectMarcas = document.getElementById('marcas');
  const selectModelos = document.getElementById('modelos');
  const selectVersiones = document.getElementById('versiones');
  
  selectMarcas.addEventListener('change', async (e) => {
    const marcaID = e.target.value;
    
    selectModelos.innerHTML = '<option value="">Seleccione un modelo</option>';
    selectModelos.disabled = !marcaID;
    selectVersiones.innerHTML = '<option value="">Seleccione un modelo primero</option>';
    selectVersiones.disabled = true;
    
    document.getElementById('productos').innerHTML = '<li class="empty-message"><div style="text-align: center; padding: 40px;"><p>Seleccione un vehículo para ver productos compatibles</p></div></li>';
    
    if (marcaID) {
      await cargarModelos(marcaID);
    }
  });
  
  selectModelos.addEventListener('change', async (e) => {
    const modeloID = e.target.value;
    
    selectVersiones.innerHTML = '<option value="">Seleccione una versión</option>';
    selectVersiones.disabled = !modeloID;
    
    document.getElementById('productos').innerHTML = '<li class="empty-message"><div style="text-align: center; padding: 40px;"><p>Seleccione una versión para ver productos compatibles</p></div></li>';
    
    if (modeloID) {
      await cargarVersiones(modeloID);
    }
  });
  
  selectVersiones.addEventListener('change', async (e) => {
    const versionID = e.target.value;
    
    if (versionID) {
      await cargarProductosCompatibles(versionID);
    } else {
      document.getElementById('productos').innerHTML = '<li class="empty-message"><div style="text-align: center; padding: 40px;"><p>Seleccione una versión para ver productos compatibles</p></div></li>';
    }
  });
}

// =============================================
// CARGAR MODELOS
// =============================================
async function cargarModelos(marcaID) {
  try {
    const response = await fetch(`${API_URL}/vehiculos/modelos/${marcaID}`);
    const modelos = await response.json();
    
    const selectModelos = document.getElementById('modelos');
    selectModelos.innerHTML = '<option value="">Seleccione un modelo</option>';
    
    modelos.forEach(modelo => {
      const option = document.createElement('option');
      option.value = modelo.ModeloVehiculoID;
      option.textContent = modelo.NombreModelo;
      selectModelos.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando modelos:', err);
    mostrarMensaje('Error al cargar modelos', 'error');
  }
}

// =============================================
// CARGAR VERSIONES
// =============================================
async function cargarVersiones(modeloID) {
  try {
    const response = await fetch(`${API_URL}/vehiculos/versiones/${modeloID}`);
    const versiones = await response.json();
    
    const selectVersiones = document.getElementById('versiones');
    selectVersiones.innerHTML = '<option value="">Seleccione una versión</option>';
    
    versiones.forEach(version => {
      const option = document.createElement('option');
      option.value = version.VersionVehiculoID;
      option.textContent = `${version.NombreVersion} (${version.Anio})`;
      selectVersiones.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando versiones:', err);
    mostrarMensaje('Error al cargar versiones', 'error');
  }
}

// =============================================
// CARGAR PRODUCTOS COMPATIBLES
// =============================================
async function cargarProductosCompatibles(versionID) {
  try {
    const response = await fetch(`${API_URL}/productos/compatibles/${versionID}`);
    const productos = await response.json();
    
    const listaProductos = document.getElementById('productos');
    
    if (productos.length === 0) {
      listaProductos.innerHTML = '<li class="empty-message"><div style="text-align: center; padding: 40px;"><p>No hay productos compatibles disponibles para esta versión</p></div></li>';
      return;
    }
    
    listaProductos.innerHTML = '';
    
    productos.forEach(producto => {
      const li = document.createElement('li');
      li.className = 'producto-item';
      
      const medida = producto.Ancho && producto.Perfil && producto.DiametroRin 
        ? `${producto.Ancho}/${producto.Perfil}R${producto.DiametroRin}` 
        : '';
      
      li.innerHTML = `
        <div class="producto-info">
          ${producto.ImagenPrincipalURL ? `<img src="${producto.ImagenPrincipalURL}" alt="${producto.NombreProducto}" onerror="this.style.display='none'">` : ''}
          <div>
            <h3>${producto.NombreProducto}</h3>
            <p class="producto-codigo">Código: ${producto.CodigoProducto}</p>
            ${medida ? `<p class="producto-medida"><strong>Medida:</strong> ${medida}</p>` : ''}
            ${producto.Descripcion ? `<p class="producto-descripcion">${producto.Descripcion}</p>` : ''}
            <p class="producto-marca">🏭 ${producto.NombreMarca}</p>
            <p class="producto-categoria">📦 ${producto.NombreCategoria}</p>
            ${producto.Posicion ? `<p class="producto-posicion">🎯 Posición: ${producto.Posicion}</p>` : ''}
            ${producto.Observacion ? `<p class="producto-observacion">💡 ${producto.Observacion}</p>` : ''}
            <p class="producto-stock">✅ Stock: ${producto.StockActual} unidades</p>
          </div>
        </div>
        <div class="producto-acciones">
          <p class="producto-precio">Bs ${producto.PrecioVentaBs.toFixed(2)}</p>
          <button class="btn-agregar" onclick="agregarAlCarrito(${producto.ProductoID}, '${producto.NombreProducto.replace(/'/g, "\\'")}', ${producto.PrecioVentaBs})">
            🛒 Agregar al Carrito
          </button>
        </div>
      `;
      listaProductos.appendChild(li);
    });
  } catch (err) {
    console.error('Error cargando productos:', err);
    mostrarMensaje('Error al cargar productos', 'error');
  }
}

// =============================================
// CARGAR PRODUCTOS DESTACADOS
// =============================================
async function cargarProductosDestacados() {
  try {
    const response = await fetch(`${API_URL}/productos/destacados`);
    const productos = await response.json();
    
    if (productos.length === 0) return;
    
    const section = document.getElementById('destacados-section');
    const lista = document.getElementById('productos-destacados');
    
    section.style.display = 'block';
    lista.innerHTML = '';
    
    productos.forEach(producto => {
      const li = document.createElement('li');
      li.className = 'producto-item';
      li.innerHTML = `
        <div class="producto-info">
          ${producto.ImagenPrincipalURL ? `<img src="${producto.ImagenPrincipalURL}" alt="${producto.NombreProducto}" onerror="this.style.display='none'">` : ''}
          <div>
            <h3>⭐ ${producto.NombreProducto}</h3>
            <p class="producto-codigo">Código: ${producto.CodigoProducto}</p>
            ${producto.Descripcion ? `<p class="producto-descripcion">${producto.Descripcion}</p>` : ''}
            <p class="producto-marca">🏭 ${producto.NombreMarca}</p>
            <p class="producto-stock">✅ Stock: ${producto.StockActual} unidades</p>
          </div>
        </div>
        <div class="producto-acciones">
          <p class="producto-precio">Bs ${producto.PrecioVentaBs.toFixed(2)}</p>
          <button class="btn-agregar" onclick="agregarAlCarrito(${producto.ProductoID}, '${producto.NombreProducto.replace(/'/g, "\\'")}', ${producto.PrecioVentaBs})">
            🛒 Agregar
          </button>
        </div>
      `;
      lista.appendChild(li);
    });
  } catch (err) {
    console.error('Error cargando productos destacados:', err);
  }
}

// =============================================
// CARRITO
// =============================================
async function cargarCarrito() {
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}`);
    const carrito = await response.json();
    
    actualizarContadorCarrito(carrito.items.length);
  } catch (err) {
    console.error('Error cargando carrito:', err);
  }
}

function actualizarContadorCarrito(cantidad) {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    cartCount.textContent = cantidad;
  }
}

async function agregarAlCarrito(productoID, nombre, precio) {
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}/agregar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoID, cantidad: 1 })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const carrito = await response.json();
    actualizarContadorCarrito(carrito.items.length);
    mostrarMensaje('✅ Producto agregado al carrito', 'success');
  } catch (err) {
    console.error('Error agregando al carrito:', err);
    mostrarMensaje('❌ ' + (err.message || 'Error al agregar al carrito'), 'error');
  }
}

function mostrarCarrito() {
  window.location.href = 'carrito.html';
}

// =============================================
// UTILIDADES
// =============================================
function mostrarMensaje(mensaje, tipo = 'info') {
  const mensajeDiv = document.createElement('div');
  mensajeDiv.className = `mensaje mensaje-${tipo}`;
  mensajeDiv.textContent = mensaje;
  mensajeDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease-in-out;
  `;
  
  document.body.appendChild(mensajeDiv);
  
  setTimeout(() => {
    mensajeDiv.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => mensajeDiv.remove(), 300);
  }, 3000);
}
