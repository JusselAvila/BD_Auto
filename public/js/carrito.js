// Configuración
const API_URL = 'http://localhost:3000/api';

function getSessionId() {
  return localStorage.getItem('sessionId');
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getUsuario() {
  const usuario = localStorage.getItem('usuario');
  return usuario ? JSON.parse(usuario) : null;
}

let carritoActual = null;

// =============================================
// CARGA INICIAL
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCarrito();
  configurarEventos();
  verificarAutenticacion();
});

// =============================================
// CARGAR CARRITO
// =============================================
async function cargarCarrito() {
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}`);
    carritoActual = await response.json();
    
    mostrarCarrito();
  } catch (err) {
    console.error('Error cargando carrito:', err);
    mostrarMensaje('Error al cargar el carrito', 'error');
  }
}

// =============================================
// MOSTRAR CARRITO EN UI
// =============================================
function mostrarCarrito() {
  const carritoItems = document.getElementById('carrito-items');
  const totalElement = document.getElementById('totalCarrito');
  
  if (!carritoActual || carritoActual.items.length === 0) {
    carritoItems.innerHTML = '<p class="cart-empty">El carrito está vacío</p>';
    totalElement.textContent = 'Bs 0.00';
    return;
  }
  
  carritoItems.innerHTML = '';
  
  carritoActual.items.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'carrito-item';
    itemDiv.innerHTML = `
      <div class="item-info">
        <h4>${item.nombre}</h4>
        <p class="item-precio">Bs ${item.precio.toFixed(2)}</p>
      </div>
      <div class="item-cantidad">
        <button class="btn-cantidad" onclick="actualizarCantidad(${item.idProducto}, ${item.cantidad - 1})">-</button>
        <span class="cantidad">${item.cantidad}</span>
        <button class="btn-cantidad" onclick="actualizarCantidad(${item.idProducto}, ${item.cantidad + 1})">+</button>
      </div>
      <div class="item-subtotal">
        <p>Bs ${item.subtotal.toFixed(2)}</p>
        <button class="btn-eliminar" onclick="eliminarItem(${item.idProducto})">
          <i class="icon-trash">🗑️</i>
        </button>
      </div>
    `;
    carritoItems.appendChild(itemDiv);
  });
  
  totalElement.textContent = `Bs ${carritoActual.total.toFixed(2)}`;
}

// =============================================
// ACTUALIZAR CANTIDAD
// =============================================
async function actualizarCantidad(idProducto, nuevaCantidad) {
  if (nuevaCantidad < 0) return;
  
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}/actualizar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idProducto, cantidad: nuevaCantidad })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    carritoActual = await response.json();
    mostrarCarrito();
    
    if (nuevaCantidad === 0) {
      mostrarMensaje('Producto eliminado del carrito', 'success');
    }
  } catch (err) {
    console.error('Error actualizando cantidad:', err);
    mostrarMensaje('Error al actualizar cantidad', 'error');
  }
}

// =============================================
// ELIMINAR ITEM
// =============================================
async function eliminarItem(idProducto) {
  await actualizarCantidad(idProducto, 0);
}

// =============================================
// VACIAR CARRITO
// =============================================
async function vaciarCarrito() {
  if (!confirm('¿Estás seguro de vaciar el carrito?')) return;
  
  try {
    const sessionId = getSessionId();
    const response = await fetch(`${API_URL}/carrito/${sessionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error al vaciar carrito');
    
    carritoActual = { items: [], total: 0 };
    mostrarCarrito();
    mostrarMensaje('Carrito vaciado', 'success');
  } catch (err) {
    console.error('Error vaciando carrito:', err);
    mostrarMensaje('Error al vaciar carrito', 'error');
  }
}

// =============================================
// CONFIGURAR EVENTOS
// =============================================
function configurarEventos() {
  const btnVaciar = document.getElementById('btn-vaciar-carrito');
  const btnFinalizar = document.getElementById('btn-finalizar-compra');
  
  if (btnVaciar) {
    btnVaciar.addEventListener('click', vaciarCarrito);
  }
  
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', finalizarCompra);
  }
}

// =============================================
// VERIFICAR AUTENTICACIÓN
// =============================================
function verificarAutenticacion() {
  const usuario = getUsuario();
  const checkoutSection = document.getElementById('checkout-section');
  
  if (!checkoutSection) return;
  
  if (usuario) {
    // Usuario autenticado - mostrar opciones de direcciones
    mostrarOpcionesAutenticado();
  } else {
    // Usuario no autenticado - solicitar datos de contacto
    mostrarOpcionesInvitado();
  }
}

// =============================================
// OPCIONES PARA USUARIO AUTENTICADO
// =============================================
async function mostrarOpcionesAutenticado() {
  const checkoutSection = document.getElementById('checkout-section');
  
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/direcciones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const direcciones = await response.json();
    
    checkoutSection.innerHTML = `
      <h3>Datos de Entrega</h3>
      <div class="direcciones-list">
        ${direcciones.length === 0 ? 
          '<p>No tienes direcciones registradas. <a href="direcciones.html">Agregar dirección</a></p>' :
          direcciones.map(dir => `
            <label class="direccion-option">
              <input type="radio" name="direccion" value="${dir.IdDireccion}" ${dir.EsPrincipal ? 'checked' : ''}>
              <div class="direccion-info">
                <strong>${dir.NombreDireccion}</strong>
                <p>${dir.Direccion}, ${dir.Ciudad}</p>
                ${dir.Zona ? `<p>Zona: ${dir.Zona}</p>` : ''}
                ${dir.Referencia ? `<p>Ref: ${dir.Referencia}</p>` : ''}
                <p>Tel: ${dir.Telefono}</p>
              </div>
            </label>
          `).join('')
        }
      </div>
      ${direcciones.length < 3 ? '<a href="direcciones.html" class="btn-link">Agregar nueva dirección</a>' : ''}
      <div class="campo">
        <label for="observaciones">Observaciones (opcional)</label>
        <textarea id="observaciones" rows="3" placeholder="Instrucciones especiales para la entrega"></textarea>
      </div>
    `;
  } catch (err) {
    console.error('Error cargando direcciones:', err);
    mostrarMensaje('Error al cargar direcciones', 'error');
  }
}

// =============================================
// OPCIONES PARA USUARIO INVITADO
// =============================================
function mostrarOpcionesInvitado() {
  const checkoutSection = document.getElementById('checkout-section');
  
  checkoutSection.innerHTML = `
    <h3>Datos de Contacto y Entrega</h3>
    <p class="info-message">Para realizar tu compra, necesitamos tus datos de contacto y entrega.</p>
    
    <div class="campo">
      <label for="emailContacto">Email *</label>
      <input type="email" id="emailContacto" required placeholder="tu@email.com">
    </div>
    
    <div class="campo">
      <label for="telefonoContacto">Teléfono *</label>
      <input type="tel" id="telefonoContacto" required placeholder="70000000">
    </div>
    
    <div class="campo">
      <label for="direccionEntrega">Dirección de Entrega *</label>
      <textarea id="direccionEntrega" required rows="3" placeholder="Calle, número, zona, ciudad"></textarea>
    </div>
    
    <div class="campo">
      <label for="observaciones">Observaciones (opcional)</label>
      <textarea id="observaciones" rows="3" placeholder="Instrucciones especiales"></textarea>
    </div>
    
    <p class="register-suggestion">
      ¿Quieres guardar tus datos para futuras compras? 
      <a href="registro-persona.html">Regístrate aquí</a>
    </p>
  `;
}

// =============================================
// FINALIZAR COMPRA
// =============================================
async function finalizarCompra() {
  if (!carritoActual || carritoActual.items.length === 0) {
    mostrarMensaje('El carrito está vacío', 'error');
    return;
  }
  
  const usuario = getUsuario();
  let datosVenta = {
    sessionId: getSessionId()
  };
  
  if (usuario) {
    // Usuario autenticado
    const direccionSeleccionada = document.querySelector('input[name="direccion"]:checked');
    
    if (!direccionSeleccionada) {
      mostrarMensaje('Por favor selecciona una dirección de entrega', 'error');
      return;
    }
    
    datosVenta.idCliente = usuario.idCliente;
    datosVenta.idDireccionEntrega = parseInt(direccionSeleccionada.value);
    datosVenta.observaciones = document.getElementById('observaciones')?.value || null;
  } else {
    // Usuario invitado
    const email = document.getElementById('emailContacto')?.value;
    const telefono = document.getElementById('telefonoContacto')?.value;
    const direccion = document.getElementById('direccionEntrega')?.value;
    
    if (!email || !telefono || !direccion) {
      mostrarMensaje('Por favor completa todos los campos requeridos', 'error');
      return;
    }
    
    if (!validarEmail(email)) {
      mostrarMensaje('Por favor ingresa un email válido', 'error');
      return;
    }
    
    datosVenta.emailContacto = email;
    datosVenta.telefonoContacto = telefono;
    datosVenta.direccionEntregaTemporal = direccion;
    datosVenta.observaciones = document.getElementById('observaciones')?.value || null;
  }
  
  try {
    const response = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(usuario ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify(datosVenta)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const resultado = await response.json();
    
    mostrarMensaje('¡Compra realizada exitosamente!', 'success');
    
    // Mostrar confirmación
    mostrarConfirmacionCompra(resultado.venta);
    
    // Limpiar carrito
    carritoActual = { items: [], total: 0 };
    mostrarCarrito();
    
  } catch (err) {
    console.error('Error finalizando compra:', err);
    mostrarMensaje(err.message || 'Error al procesar la compra', 'error');
  }
}

// =============================================
// MOSTRAR CONFIRMACIÓN DE COMPRA
// =============================================
function mostrarConfirmacionCompra(venta) {
  const modal = document.createElement('div');
  modal.className = 'modal-confirmacion';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>¡Compra Exitosa!</h2>
      </div>
      <div class="modal-body">
        <div class="icono-exito">✓</div>
        <p>Tu pedido ha sido registrado exitosamente</p>
        <div class="datos-compra">
          <p><strong>Número de Factura:</strong> ${venta.numeroFactura}</p>
          <p><strong>ID de Venta:</strong> ${venta.idVenta}</p>
        </div>
        <p class="mensaje-confirmacion">
          Recibirás una confirmación por email con los detalles de tu pedido.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="cerrarModalConfirmacion()">Entendido</button>
        <a href="index.html" class="btn-secondary">Volver al Inicio</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Estilos del modal
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
}

function cerrarModalConfirmacion() {
  const modal = document.querySelector('.modal-confirmacion');
  if (modal) {
    modal.remove();
    window.location.href = 'index.html';
  }
}

// =============================================
// UTILIDADES
// =============================================
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

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
