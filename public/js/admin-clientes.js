// =============================================
// CLIENT MANAGEMENT MODULE
// =============================================

checkAdminAuth();

let clientes = [];

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

async function loadClientes() {
    try {
        showLoading('#clientes-table tbody');

        // Simulated data - replace with actual API call
        // Example: const response = await apiRequest('/admin/clientes');
        // clientes = await response.json();

        clientes = [
            {
                ClienteID: 1,
                TipoCliente: 'Persona',
                NombreCompleto: 'Juan Pérez García',
                Email: 'juan.perez@email.com',
                Telefono: '77123456',
                CI: '8765432',
                TotalCompras: 5,
                TotalGastado: 4250.00,
                FechaRegistro: '2024-01-15'
            },
            {
                ClienteID: 2,
                TipoCliente: 'Empresa',
                NombreCompleto: 'Transportes Rápidos SRL',
                Email: 'contacto@transportesrapidos.com',
                Telefono: '33456789',
                NIT: '1234567890',
                TotalCompras: 12,
                TotalGastado: 15800.00,
                FechaRegistro: '2024-02-20'
            },
            {
                ClienteID: 3,
                TipoCliente: 'Persona',
                NombreCompleto: 'María Rodriguez López',
                Email: 'maria.rodriguez@email.com',
                Telefono: '70987654',
                CI: '9876543',
                TotalCompras: 2,
                TotalGastado: 1680.00,
                FechaRegistro: '2024-03-10'
            },
            {
                ClienteID: 4,
                TipoCliente: 'Empresa',
                NombreCompleto: 'Distribuidora del Este',
                Email: 'ventas@distribuidoraeste.com',
                Telefono: '33789456',
                NIT: '9876543210',
                TotalCompras: 8,
                TotalGastado: 9500.00,
                FechaRegistro: '2024-01-25'
            }
        ];

        renderClientes(clientes);
    } catch (err) {
        console.error('Error loading clientes:', err);
        showError('#clientes-table tbody', 'Error al cargar clientes');
        showToast('Error al cargar clientes', 'error');
    }
}

// =============================================
// RENDER
// =============================================

function renderClientes(data) {
    const tbody = document.querySelector('#clientes-table tbody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No se encontraron clientes</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(c => `
    <tr>
      <td><strong>${c.ClienteID}</strong></td>
      <td>
        <strong>${c.NombreCompleto}</strong>
        <br>
        <small style="color: rgba(255,255,255,0.6);">
          ${c.TipoCliente === 'Persona' ? `CI: ${c.CI}` : `NIT: ${c.NIT}`}
        </small>
      </td>
      <td>
        <span class="badge ${c.TipoCliente === 'Persona' ? 'badge-info' : 'badge-success'}">
          ${c.TipoCliente === 'Persona' ? '👤 Persona' : '🏢 Empresa'}
        </span>
      </td>
      <td>${c.Email}</td>
      <td>${c.Telefono || '-'}</td>
      <td><strong>${c.TotalCompras || 0}</strong></td>
      <td><strong>${formatCurrency(c.TotalGastado || 0)}</strong></td>
      <td>
        <button class="btn-sm btn-primary" onclick="viewHistorial(${c.ClienteID})" title="Ver Historial">📋</button>
      </td>
    </tr>
  `).join('');
}

// =============================================
// FILTER
// =============================================

function filterClientes() {
    const searchTerm = document.getElementById('search-clientes').value.toLowerCase();
    const tipoFilter = document.getElementById('filter-tipo').value;

    let filtered = clientes.filter(c => {
        const matchSearch = !searchTerm ||
            c.NombreCompleto.toLowerCase().includes(searchTerm) ||
            c.Email.toLowerCase().includes(searchTerm) ||
            (c.CI && c.CI.includes(searchTerm)) ||
            (c.NIT && c.NIT.includes(searchTerm));

        const matchTipo = !tipoFilter || c.TipoCliente === tipoFilter;

        return matchSearch && matchTipo;
    });

    renderClientes(filtered);
}

// =============================================
// HISTORIAL
// =============================================

async function viewHistorial(clienteID) {
    const cliente = clientes.find(c => c.ClienteID === clienteID);
    if (!cliente) return;

    document.getElementById('historial-cliente-nombre').textContent = cliente.NombreCompleto;
    document.getElementById('historial-cliente-email').textContent = cliente.Email;

    openModal('modal-historial');

    try {
        showLoading('#historial-table tbody');

        // Simulated data - replace with actual API call
        // Example: const response = await apiRequest(`/admin/clientes/${clienteID}/historial`);
        // const historial = await response.json();

        const historial = [
            {
                VentaID: 1,
                NumeroFactura: 'FAC-001',
                FechaVenta: '2024-11-15T10:30:00',
                CantidadProductos: 2,
                TotalVentaBs: 1700.00,
                NombreEstado: 'Completado'
            },
            {
                VentaID: 2,
                NumeroFactura: 'FAC-015',
                FechaVenta: '2024-11-20T14:15:00',
                CantidadProductos: 1,
                TotalVentaBs: 850.00,
                NombreEstado: 'Completado'
            },
            {
                VentaID: 3,
                NumeroFactura: 'FAC-032',
                FechaVenta: '2024-11-28T09:45:00',
                CantidadProductos: 4,
                TotalVentaBs: 3400.00,
                NombreEstado: 'Pendiente'
            }
        ];

        const tbody = document.querySelector('#historial-table tbody');

        if (historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: rgba(255,255,255,0.5);">Este cliente aún no ha realizado compras</td></tr>';
            return;
        }

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
