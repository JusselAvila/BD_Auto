/* ============================================================
   1. CONFIGURACIÓN
============================================================ */
const API_URL = 'http://localhost:3000/api';

/* ============================================================
   2. AUTENTICACIÓN Y SESIÓN
============================================================ */
function getSessionId() {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getToken() {
  return localStorage.getItem('authToken');
}

function getUsuario() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

function isAuthenticated() {
  return getToken() !== null;
}

function cerrarSesion() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

/* ============================================================
   3. UI DEL HEADER
============================================================ */
function actualizarHeaderUI() {
  const usuario = getUsuario();
  const headerActions = document.querySelector('.header-actions');

  let html = `
    <button id="btn-carrito" class="btn-login">
      🛒 Carrito <span id="cart-count" class="cart-count">0</span>
    </button>
  `;

  if (usuario) {
    html += `
      <span class="user-name">¡Hola, ${usuario.nombre}! 👋</span>
      <a href="perfil.html" class="btn-login">👤 Mi Perfil</a>
      <button id="btn-mis-compras" class="btn-login">📦 Mis Compras</button>
      ${usuario.rolID === 1 ? '<a href="admin.html" class="btn-login">⚙️ Admin</a>' : ''}
      <button id="btn-cerrar-sesion" class="btn-primary">🚪 Cerrar Sesión</button>
    `;
  } else {
    html += `<a href="login.html" class="btn-primary">Iniciar Sesión</a>`;
  }

  headerActions.innerHTML = html;

  // Listeners
  document.getElementById('btn-carrito').addEventListener('click', mostrarCarrito);

  if (usuario) {
    document.getElementById('btn-mis-compras').addEventListener('click', () => {
      window.location.href = 'historial.html';
    });
    document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);
  }
}

/* ============================================================
   4. INICIALIZACIÓN GENERAL
============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  getSessionId();
  actualizarHeaderUI();
  configurarEventos();

  await cargarMarcas();
  await cargarProductosDestacados();
  await cargarCarrito();
});

/* ============================================================
   5. VEHÍCULOS (Marcas / Modelos / Versiones)
============================================================ */

// ---- MARCAS ----
async function cargarMarcas() {
  try {
    const response = await fetch(`${API_URL}/vehiculos/marcas`);
    const marcas = await response.json();

    const select = document.getElementById('marcas');
    select.innerHTML = '<option value="">Seleccione una marca</option>';

    marcas.forEach(m => {
      const option = document.createElement('option');
      option.value = m.MarcaVehiculoID;
      option.textContent = m.NombreMarca;
      select.appendChild(option);
    });
  } catch (err) {
    mostrarMensaje('Error al cargar marcas', 'error');
  }
}

// ---- MODELOS ----
async function cargarModelos(marcaID) {
  try {
    const response = await fetch(`${API_URL}/vehiculos/modelos/${marcaID}`);
    const modelos = await response.json();

    const select = document.getElementById('modelos');
    select.innerHTML = '<option value="">Seleccione un modelo</option>';

    modelos.forEach(m => {
      const option = document.createElement('option');
      option.value = m.ModeloVehiculoID;
      option.textContent = m.NombreModelo;
      select.appendChild(option);
    });
  } catch (err) {
    mostrarMensaje('Error al cargar modelos', 'error');
  }
}

async function cargarAnios(modeloID) {
  try {
    // Llama al endpoint del servidor
    const response = await fetch(`${API_URL}/vehiculos/anios/${modeloID}`);
    const anios = await response.json();

    // 🟢 NOTA: Usamos el select con ID 'versiones' para los AÑOS
    const selectAnios = document.getElementById('anios');
    selectAnios.innerHTML = '<option value="">Seleccione un año</option>';
    selectAnios.disabled = false;

    anios.forEach(anio => {
      const option = document.createElement('option');
      option.value = anio.Anio; // Usamos el campo Anio como valor y texto
      option.textContent = anio.Anio;
      selectAnios.appendChild(option);
    });
  } catch (err) {
    console.error('Error cargando años:', err);
    mostrarMensaje('Error al cargar años', 'error');
  }
}

// ========================================================
// ---- PRODUCTOS COMPATIBLES (MODELO + AÑO) ----
// ========================================================
// 🟢 CORRECCIÓN 1: La función ahora acepta modeloID y anio
async function cargarProductosCompatibles(modeloID, anio) {
  try {
    // 🟢 CORRECCIÓN 2: La URL usa la nueva ruta con Modelo y Año
    const response = await fetch(`${API_URL}/productos/compatibles/${modeloID}/${anio}`);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron cargar los productos compatibles.`);
    }

    const productos = await response.json();

    const lista = document.getElementById('productos');

    if (productos.length === 0) {
      lista.innerHTML = '<li class="empty-message"><p>No hay productos disponibles para este vehículo</p></li>';
      return;
    }

    lista.innerHTML = '';

    productos.forEach(p => {
      // Usamos MedidaCompleta si está disponible, si no, lo construimos
      const medida = p.MedidaCompleta || (p.Ancho && p.Perfil && p.DiametroRin ? `${p.Ancho}/${p.Perfil}R${p.DiametroRin}` : '');

      // La lógica de renderizado sigue siendo válida, ya que tu SP retorna todos los campos.

      lista.innerHTML += `
        <li class="producto-item">
          <div class="producto-info">
            ${p.ImagenPrincipalURL ? `<img src="${p.ImagenPrincipalURL}" alt="${p.NombreProducto}">` : ''}
            <div>
              <h3>${p.NombreProducto}</h3>
              <p class="producto-codigo">Código: ${p.CodigoProducto}</p>
              ${medida ? `<p><strong>Medida:</strong> ${medida}</p>` : ''}
              <p class="producto-marca">🏭 ${p.MarcaLlanta}</p>
              <p class="producto-categoria">📦 ${p.NombreCategoria}</p>
              <p class="producto-stock">Stock: ${p.StockActual}</p>
            </div>
          </div>

          <div class="producto-acciones">
            <p class="producto-precio">Bs ${p.PrecioVentaBs.toFixed(2)}</p>
            <button class="btn-agregar"
              onclick="agregarAlCarrito(${p.ProductoID}, '${p.NombreProducto.replace(/'/g, "\\'")}', ${p.PrecioVentaBs})">
              🛒 Agregar
            </button>
          </div>
        </li>
      `;
    });
  } catch (err) {
    console.error('Error al cargar productos compatibles:', err);
    mostrarMensaje('Error al cargar productos. ' + err.message, 'error');
  }
}

// ---- PRODUCTOS DESTACADOS ----
async function cargarProductosDestacados() {
  try {
    const response = await fetch(`${API_URL}/productos/destacados`);
    const productos = await response.json();

    if (productos.length === 0) return;

    const lista = document.getElementById('productos-destacados');
    const section = document.getElementById('destacados-section');

    section.style.display = 'block';
    lista.innerHTML = '';

    productos.forEach(p => {
      lista.innerHTML += `
        <li class="producto-item">
          <div class="producto-info">
            ${p.ImagenPrincipalURL ? `<img src="${p.ImagenPrincipalURL}">` : ''}
            <div>
              <h3>⭐ ${p.NombreProducto}</h3>
              <p>Código: ${p.CodigoProducto}</p>
              <p>🏭 ${p.NombreMarca}</p>
              <p>Stock: ${p.StockActual}</p>
            </div>
          </div>

          <div class="producto-acciones">
            <p class="producto-precio">Bs ${p.PrecioVentaBs.toFixed(2)}</p>
            <button class="btn-agregar"
              onclick="agregarAlCarrito(${p.ProductoID}, '${p.NombreProducto.replace(/'/g, "\\'")}', ${p.PrecioVentaBs})">
              🛒 Agregar
            </button>
          </div>
        </li>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================
   7. CARRITO
============================================================ */
async function cargarCarrito() {
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}`);
    const carrito = await response.json();

    actualizarContadorCarrito(carrito.items.length);
  } catch (err) {
    mostrarMensaje('Error al cargar carrito', 'error');
  }
}

function actualizarContadorCarrito(cantidad) {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cantidad;
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
      throw new Error((await response.json()).error);
    }

    const carrito = await response.json();
    actualizarContadorCarrito(carrito.items.length);

    mostrarMensaje('Producto agregado correctamente', 'success');
  } catch (err) {
    mostrarMensaje(err.message, 'error');
  }
}

function mostrarCarrito() {
  window.location.href = 'carrito.html';
}

/* ============================================================
   8. EVENTOS
============================================================ */
function configurarEventos() {
  const selectMarcas = document.getElementById('marcas');
  const selectModelos = document.getElementById('modelos');
  const selectAnios = document.getElementById('anios');

  // Marcas
  selectMarcas.addEventListener('change', async e => {
    const id = e.target.value;

    selectModelos.disabled = !id;
    selectAnios.disabled = true;
    selectModelos.innerHTML = '<option value="">Seleccione un modelo</option>';
    selectAnios.innerHTML = '<option value="">Seleccione un año</option>';

    resetProductosUI();

    if (id) await cargarModelos(id);
  });

  // Modelos
  // Modelos (CORREGIDO)
  selectModelos.addEventListener('change', async e => {
    const id = e.target.value; // Este es el ModeloID

    selectAnios.disabled = !id;
    selectAnios.innerHTML = '<option value="">Seleccione un año</option>';

    resetProductosUI();

    if (id) {
      await cargarAnios(id); // ⚠️ carga los años del modelo
    }
  });

  selectAnios.addEventListener('change', async (e) => {
    const anio = e.target.value;
    const modeloID = selectModelos.value;

    if (anio && modeloID) {
      await cargarProductosCompatibles(modeloID, anio);
    } else {
      document.getElementById('productos').innerHTML = '<li class="empty-message"><p>Seleccione un modelo y año para ver productos compatibles</p></li>';
    }
  });
}


function resetProductosUI() {
  document.getElementById('productos').innerHTML =
    '<li class="empty-message"><p>Seleccione un vehículo</p></li>';
}

/* ============================================================\
 9. UTILIDADES (Asegúrate de que esta función NO esté anidada)
============================================================ */


// 🟢 CORRECCIÓN: Colocar esta función al inicio o al final del script.js,
// pero fuera de cualquier otra función contenedora.
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
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.5s, transform 0.5s;
    transform: translateY(20px);
  `;

  document.body.appendChild(mensajeDiv);

  // Animación de entrada
  setTimeout(() => {
    mensajeDiv.style.opacity = 1;
    mensajeDiv.style.transform = 'translateY(0)';
  }, 10);

  // Animación de salida y remoción después de 3 segundos
  setTimeout(() => {
    mensajeDiv.style.opacity = 0;
    mensajeDiv.style.transform = 'translateY(20px)';
    setTimeout(() => mensajeDiv.remove(), 500);
  }, 3000);

}
