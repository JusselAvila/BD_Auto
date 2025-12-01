// =============================================
// CLIENT MANAGEMENT MODULE
// =============================================

checkAdminAuth(); // Asume que esta función existe en admin-common.js

let clientes = []; // Almacena la lista completa de clientes

document.addEventListener('DOMContentLoaded', async () => {
  await loadClientes();
  setupEventListeners();
});

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  document.getElementById('search-clientes').addEventListener('input', filterClientes);
  document.getElementById('filter-tipo').addEventListener('change', filterClientes);
}

// =============================================
// LOAD DATA
// =============================================

/**
 * Carga la lista de clientes desde el backend (usando sp_ObtenerClientesAdmin).
 */
async function loadClientes() {
  try {
    showLoading('#clientes-table tbody');

    // 🟢 MODIFICACIÓN CLAVE: Llamada real a la API para la tabla principal
    const response = await apiRequest('/admin/clientes');

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    clientes = await response.json(); // Data del SP sp_ObtenerClientesAdmin

    renderClientes(clientes);
  } catch (err) {
    console.error('Error loading clientes:', err);
    showError('#clientes-table tbody', 'Error al cargar clientes');
    showToast('Error al cargar clientes', 'error');
  }
}

// =============================================
// RENDERING & FILTERING
// =============================================

/**
 * Renderiza la lista de clientes en la tabla HTML.
 * @param {Array<Object>} list - La lista de clientes a renderizar.
 */
function renderClientes(list) {
  const tbody = document.querySelector('#clientes-table tbody');

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">No se encontraron clientes que coincidan con los filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(cliente => {
    // Determina el número de documento a mostrar (CI o NIT)
    const documento = cliente.CI || cliente.NIT || 'N/A';
    const docLabel = cliente.CI ? 'CI' : (cliente.NIT ? 'NIT' : 'Doc.');

    // Clase para el badge de tipo
    const tipoBadge = cliente.TipoCliente === 'Empresa' ? 'badge-primary' : 'badge-info';

    return `
      <tr>
        <td>${cliente.ClienteID}</td>
        <td>
          <span class="badge ${tipoBadge}">${cliente.TipoCliente}</span>
        </td>
        <td class="text-left"><strong>${cliente.NombreCompleto}</strong></td>
        <td>${documento} (${docLabel})</td>
        <td>${cliente.TotalCompras}</td>
        <td>${formatCurrency(cliente.TotalGastado)}</td>
        <td>${cliente.FechaRegistro}</td>
        <td>
          <button class="btn-icon btn-small btn-secondary" title="Ver Historial" onclick="viewHistorial(${cliente.ClienteID})">
            <i class="fas fa-history"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filtra la lista de clientes basada en la búsqueda y el tipo.
 */
function filterClientes() {
  const searchTerm = document.getElementById('search-clientes').value.toLowerCase();
  const filterTipo = document.getElementById('filter-tipo').value;

  const filteredList = clientes.filter(cliente => {
    // 1. Filtrar por término de búsqueda (nombre, email, documento)
    const matchesSearch =
      cliente.NombreCompleto.toLowerCase().includes(searchTerm) ||
      cliente.Email.toLowerCase().includes(searchTerm) ||
      (cliente.CI && cliente.CI.includes(searchTerm)) ||
      (cliente.NIT && cliente.NIT.includes(searchTerm));

    // 2. Filtrar por tipo de cliente
    const matchesTipo = filterTipo === 'all' || cliente.TipoCliente === filterTipo;

    return matchesSearch && matchesTipo;
  });

  renderClientes(filteredList);
}

// =============================================
// HISTORIAL
// =============================================

/**
 * Muestra el historial de ventas de un cliente específico (usando sp_ObtenerHistorialVentasCliente).
 * @param {number} clienteID - ID del cliente.
 */
async function viewHistorial(clienteID) {
  const cliente = clientes.find(c => c.ClienteID === clienteID);
  if (!cliente) return;

  document.getElementById('historial-cliente-nombre').textContent = cliente.NombreCompleto;
  document.getElementById('historial-cliente-email').textContent = cliente.Email;

  openModal('modal-historial');

  try {
    showLoading('#historial-table tbody');

    // 🟢 MODIFICACIÓN CLAVE: Llamada real a la API para el historial específico
    // El endpoint usa el clienteID y el backend ejecuta el SP
    const response = await apiRequest(`/admin/clientes/${clienteID}/historial`);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const historial = await response.json(); // Data del SP sp_ObtenerHistorialVentasCliente

    const tbody = document.querySelector('#historial-table tbody');

    if (historial.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">Este cliente aún no ha realizado compras</td></tr>';
      return;
    }

    // El mapping usa los alias definidos en el SP (NumeroFactura, CantidadProductos, TotalVentaBs, NombreEstado)
    tbody.innerHTML = historial.map(v => `
      <tr>
        <td><strong>${v.NumeroFactura}</strong></td>
        <td>${formatDateTime(v.FechaVenta)}</td>
        <td>${v.CantidadProductos} item(s)</td>
        <td><strong>${formatCurrency(v.TotalVentaBs)}</strong></td>
        <td>
          <span class="badge ${v.NombreEstado === 'Completado' ? 'badge-success' : 'badge-warning'}">
            ${v.NombreEstado}
          </span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading historial:', err);
    showError('#historial-table tbody', 'Error al cargar historial');
  }
}