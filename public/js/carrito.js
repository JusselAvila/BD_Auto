// =============================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// =============================================
const API_URL = '/api'; // Usar rutas relativas
let carritoActual = null;
let direccionParaSeleccionar = null; // Para seleccionar una dirección recién creada

// =============================================
// HELPERS - OBTENER DATOS DE SESIÓN
// =============================================
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

// =============================================
// INICIALIZACIÓN DE LA PÁGINA
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCarrito();
    configurarEventosPrincipales();
});

// =============================================
// LÓGICA PRINCIPAL DEL CARRITO
// =============================================

async function cargarCarrito() {
    try {
        const sessionId = getSessionId();
        if (!sessionId) return;
        const response = await fetch(`${API_URL}/carrito/${sessionId}`);
        if (!response.ok) throw new Error('No se pudo cargar el carrito.');
        
        carritoActual = await response.json();
        renderizarCarrito();
    } catch (error) {
        console.error('Error cargando carrito:', error);
        mostrarMensaje(error.message, 'error');
    }
}

function renderizarCarrito() {
    const itemsContainer = document.getElementById('carrito-items');
    const totalElement = document.getElementById('carrito-total');
    const subtotalElement = document.getElementById('subtotal');
    const divVacio = document.getElementById('carrito-vacio');
    const divContenido = document.getElementById('carrito-contenido');

    if (!carritoActual || carritoActual.items.length === 0) {
        divVacio.style.display = 'block';
        divContenido.style.display = 'none';
        return;
    }

    divVacio.style.display = 'none';
    divContenido.style.display = 'block';

    itemsContainer.innerHTML = '';
    let subtotal = 0;

    carritoActual.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrito-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <h4>${item.nombre}</h4>
                <p class="item-precio">Bs ${item.precio.toFixed(2)}</p>
            </div>
            <div class="item-cantidad">
                <button class="btn-cantidad" data-id="${item.productoID}" data-cantidad="${item.cantidad - 1}">-</button>
                <span class="cantidad">${item.cantidad}</span>
                <button class="btn-cantidad" data-id="${item.productoID}" data-cantidad="${item.cantidad + 1}">+</button>
            </div>
            <div class="item-subtotal">
                <p>Bs ${item.subtotal.toFixed(2)}</p>
                <button class="btn-eliminar" data-id="${item.productoID}">🗑️</button>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
        subtotal += item.subtotal;
    });

    subtotalElement.textContent = `Bs ${subtotal.toFixed(2)}`;
    totalElement.textContent = `Bs ${carritoActual.total.toFixed(2)}`;
}

async function actualizarCantidad(productoID, cantidad) {
    if (cantidad < 0) return;
    try {
        const sessionId = getSessionId();
        const response = await fetch(`${API_URL}/carrito/${sessionId}/actualizar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productoID, cantidad })
        });
        if (!response.ok) throw new Error('Error al actualizar.');

        carritoActual = await response.json();
        renderizarCarrito();
    } catch (error) {
        console.error('Error actualizando cantidad:', error);
        mostrarMensaje(error.message, 'error');
    }
}

// =============================================
// LÓGICA DEL MODAL DE CHECKOUT
// =============================================

async function abrirModalCheckout() {
    const usuario = getUsuario();
    const modal = document.getElementById('modal-checkout');

    if (!usuario) {
        document.getElementById('checkout-invitado').style.display = 'block';
        document.getElementById('checkout-autenticado').style.display = 'none';
    } else {
        document.getElementById('checkout-invitado').style.display = 'none';
        document.getElementById('checkout-autenticado').style.display = 'block';
        document.getElementById('form-nueva-direccion').style.display = 'none';
        await cargarDireccionesCheckout();
        await cargarMetodosPagoCheckout();
    }
    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-checkout').style.display = 'none';
}

async function fetchAPI(url, options = {}) {
    const token = getAuthToken();
    if (!token) {
        mostrarMensaje('No estás autenticado.', 'error');
        throw new Error('Token no encontrado');
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ocurrió un error en la solicitud.');
    }
    return response.json();
}

async function cargarDireccionesCheckout() {
    const select = document.getElementById('direccion-select');
    try {
        const direcciones = await fetchAPI(`${API_URL}/direcciones`);
        select.innerHTML = '<option value="">Seleccione una dirección...</option>';
        if (direcciones.length === 0) {
            select.innerHTML = '<option value="">No tienes direcciones guardadas</option>';
            return;
        }
        direcciones.forEach(dir => {
            const option = document.createElement('option');
            option.value = dir.DireccionID;
            option.textContent = `${dir.NombreDireccion} - ${dir.Calle}, ${dir.NombreCiudad}`;
            if (dir.EsPrincipal) option.selected = true;
            select.appendChild(option);
        });
        if (direccionParaSeleccionar) {
            select.value = direccionParaSeleccionar;
            direccionParaSeleccionar = null;
        }
    } catch (error) {
        console.error('Error cargando direcciones:', error);
        select.innerHTML = '<option value="">Error al cargar direcciones</option>';
    }
}

async function cargarMetodosPagoCheckout() {
    const select = document.getElementById('metodo-pago');
    try {
        const metodos = await fetch(`${API_URL}/metodos-pago`);
        if (!metodos.ok) throw new Error('Error de red.');
        const data = await metodos.json();
        select.innerHTML = '<option value="">Seleccione un método de pago...</option>';
        data.forEach(metodo => {
            const option = document.createElement('option');
            option.value = metodo.MetodoPagoID;
            option.textContent = metodo.NombreMetodo;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}

// =============================================
// LÓGICA DEL FORMULARIO DE NUEVA DIRECCIÓN (DENTRO DEL MODAL)
// =============================================

function mostrarFormularioNuevaDireccion() {
    document.getElementById('checkout-autenticado').style.display = 'none';
    document.getElementById('form-nueva-direccion').style.display = 'block';
    cargarDepartamentosForm();
}

function cancelarNuevaDireccion() {
    document.getElementById('form-nueva-direccion').style.display = 'none';
    document.getElementById('checkout-autenticado').style.display = 'block';
}

async function cargarDepartamentosForm() {
    const select = document.getElementById('departamento');
    try {
        const response = await fetch('/api/departamentos');
        const departamentos = await response.json();
        select.innerHTML = '<option value="">Seleccione un departamento</option>';
        departamentos.forEach(dep => {
            const option = document.createElement('option');
            option.value = dep.DepartamentoID;
            option.textContent = dep.NombreDepartamento;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando departamentos:', error);
    }
}

async function cargarCiudadesForm(departamentoID) {
    const select = document.getElementById('ciudad');
    select.disabled = true;
    try {
        const response = await fetch(`/api/ciudades/${departamentoID}`);
        const ciudades = await response.json();
        select.innerHTML = '<option value="">Seleccione una ciudad</option>';
        ciudades.forEach(ciudad => {
            const option = document.createElement('option');
            option.value = ciudad.CiudadID;
            option.textContent = ciudad.NombreCiudad;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error cargando ciudades:', error);
    }
}

async function guardarNuevaDireccion(e) {
    e.preventDefault();
    const formData = {
        NombreDireccion: document.getElementById('nombre-direccion').value,
        Calle: document.getElementById('calle').value,
        Zona: document.getElementById('zona').value,
        CiudadID: document.getElementById('ciudad').value,
        Referencia: document.getElementById('referencia').value,
        EsPrincipal: false 
    };

    try {
        const data = await fetchAPI(`${API_URL}/perfil/direccion`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        mostrarMensaje('Dirección guardada con éxito.', 'success');
        direccionParaSeleccionar = data.data.DireccionID;
        cancelarNuevaDireccion();
        await cargarDireccionesCheckout();
    } catch (error) {
        console.error('Error guardando nueva dirección:', error);
        mostrarMensaje(error.message, 'error');
    }
}

// =============================================
// LÓGICA DE FINALIZAR VENTA
// =============================================
async function procesarVenta(e) {
    e.preventDefault();
    const direccionEnvioID = document.getElementById('direccion-select').value;
    const metodoPagoID = document.getElementById('metodo-pago').value;

    if (!direccionEnvioID) {
        mostrarMensaje('Por favor, selecciona una dirección de entrega.', 'error');
        return;
    }
    if (!metodoPagoID) {
        mostrarMensaje('Por favor, selecciona un método de pago.', 'error');
        return;
    }

    const payload = {
        direccionEnvioID: parseInt(direccionEnvioID),
        metodoPagoID: parseInt(metodoPagoID),
        observaciones: document.getElementById('observaciones').value,
        sessionId: getSessionId()
    };

    try {
        const data = await fetchAPI(`${API_URL}/ventas`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        cerrarModal();
        document.getElementById('numero-factura').textContent = `Factura #${data.venta.numeroFactura}`;
        document.getElementById('modal-confirmacion').style.display = 'flex';
    } catch (error) {
        console.error('Error al procesar la venta:', error);
        mostrarMensaje(error.message, 'error');
    }
}

// =============================================
// CONFIGURACIÓN DE EVENTOS PRINCIPALES
// =============================================
function configurarEventosPrincipales() {
    const itemsContainer = document.getElementById('carrito-items');
    if (itemsContainer) {
        itemsContainer.addEventListener('click', e => {
            if (e.target.matches('.btn-cantidad')) {
                const id = e.target.dataset.id;
                const cant = parseInt(e.target.dataset.cantidad);
                actualizarCantidad(id, cant);
            }
            if (e.target.matches('.btn-eliminar')) {
                const id = e.target.dataset.id;
                if (confirm('¿Quitar este producto del carrito?')) {
                    actualizarCantidad(id, 0);
                }
            }
        });
    }

    document.getElementById('btn-finalizar-compra').addEventListener('click', abrirModalCheckout);
    document.querySelector('#modal-checkout .modal-close').addEventListener('click', cerrarModal);
    document.getElementById('btn-agregar-direccion').addEventListener('click', (e) => {
        e.preventDefault();
        mostrarFormularioNuevaDireccion();
    });
    document.querySelector('#form-nueva-direccion .btn-secondary').addEventListener('click', cancelarNuevaDireccion);
    document.getElementById('departamento').addEventListener('change', (e) => {
        if (e.target.value) cargarCiudadesForm(e.target.value);
    });
    document.getElementById('form-agregar-direccion').addEventListener('submit', guardarNuevaDireccion);
    document.getElementById('form-checkout').addEventListener('submit', procesarVenta);
}

// =============================================
// UTILIDADES
// =============================================
function mostrarMensaje(mensaje, tipo = 'info') {
    const div = document.createElement('div');
    div.className = `mensaje-flotante`;
    div.style.backgroundColor = tipo === 'error' ? '#f44336' : '#4CAF50';
    div.textContent = mensaje;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
