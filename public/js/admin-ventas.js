// =============================================
// SALES & INVOICING MODULE
// =============================================

checkAdminAuth();

let ventas = [];
let productos = [];
let clientes = [];
let posCart = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadVentas();
    await loadProductos();
    await loadClientes();
    setupEventListeners();
    updateStats();
});

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    document.getElementById('btn-nueva-venta').addEventListener('click', openPOS);
    document.getElementById('filter-fecha-inicio').addEventListener('change', filterVentas);
    document.getElementById('filter-fecha-fin').addEventListener('change', filterVentas);
    document.getElementById('filter-estado').addEventListener('change', filterVentas);
    document.getElementById('btn-reportes').addEventListener('click', generateReport);

    // POS
    document.getElementById('pos-search-producto').addEventListener('input', searchProductos);
    document.getElementById('pos-descuento').addEventListener('input', updatePOSTotal);
    document.getElementById('btn-procesar-venta').addEventListener('click', procesarVenta);
}

// =============================================
// LOAD DATA
// =============================================

async function loadVentas() {
    try {
        showLoading('#ventas-table tbody');

        // Simulated data - replace with actual API call
        ventas = [
            {
                VentaID: 1,
                NumeroFactura: 'FAC-001',
                FechaVenta: '2024-11-28T10:30:00',
                ClienteNombre: 'Juan Pérez García',
                CantidadProductos: 2,
                DescuentoPorcentaje: 0,
                DescuentoBs: 0,
                TotalVentaBs: 1700.00,
                NombreEstado: 'Completado'
            },
            {
                VentaID: 2,
                NumeroFactura: 'FAC-002',
                FechaVenta: '2024-11-29T14:15:00',
                ClienteNombre: 'Transportes Rápidos SRL',
                CantidadProductos: 4,
                DescuentoPorcentaje: 10,
                DescuentoBs: 368.00,
                TotalVentaBs: 3312.00,
                NombreEstado: 'Completado'
            },
            {
                VentaID: 3,
                NumeroFactura: 'FAC-003',
                FechaVenta: '2024-11-30T09:45:00',
                ClienteNombre: 'María Rodriguez López',
                CantidadProductos: 1,
                DescuentoPorcentaje: 5,
                DescuentoBs: 42.50,
                TotalVentaBs: 807.50,
                NombreEstado: 'Pendiente'
            }
        ];

        renderVentas(ventas);
    } catch (err) {
        console.error('Error loading ventas:', err);
        showError('#ventas-table tbody', 'Error al cargar ventas');
    }
}

async function loadProductos() {
    // Simulated - use same data as admin-productos
    productos = [
        {
            ProductoID: 1,
            CodigoProducto: 'LLA-001',
            NombreProducto: 'Llanta Michelin Primacy 4',
            PrecioVentaBs: 850.00,
            StockActual: 25
        },
        {
            ProductoID: 2,
            CodigoProducto: 'LLA-002',
            NombreProducto: 'Llanta Goodyear Eagle F1',
            PrecioVentaBs: 920.00,
            StockActual: 5
        },
        {
            ProductoID: 3,
            CodigoProducto: 'LLA-003',
            NombreProducto: 'Llanta Bridgestone Turanza',
            PrecioVentaBs: 780.00,
            StockActual: 15
        }
    ];
}

async function loadClientes() {
    // Simulated
    clientes = [
        { ClienteID: 1, NombreCompleto: 'Juan Pérez García' },
        { ClienteID: 2, NombreCompleto: 'Transportes Rápidos SRL' },
        { ClienteID: 3, NombreCompleto: 'María Rodriguez López' }
    ];

    const select = document.getElementById('pos-cliente');
    clientes.forEach(c => {
        select.innerHTML += `<option value="${c.ClienteID}">${c.NombreCompleto}</option>`;
    });
}

// =============================================
// RENDER
// =============================================

function renderVentas(data) {
    const tbody = document.querySelector('#ventas-table tbody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No se encontraron ventas</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(v => `
    <tr>
      <td><strong>${v.NumeroFactura}</strong></td>
      <td>${formatDateTime(v.FechaVenta)}</td>
      <td>${v.ClienteNombre}</td>
      <td>${v.CantidadProductos} item(s)</td>
      <td>${v.DescuentoPorcentaje > 0 ? `${v.DescuentoPorcentaje}% (${formatCurrency(v.DescuentoBs)})` : '-'}</td>
      <td><strong>${formatCurrency(v.TotalVentaBs)}</strong></td>
      <td>
        <span class="badge ${v.NombreEstado === 'Completado' ? 'badge-success' : v.NombreEstado === 'Pendiente' ? 'badge-warning' : 'badge-danger'}">
          ${v.NombreEstado}
        </span>
      </td>
      <td>
        <button class="btn-sm btn-primary" onclick="viewDetalle(${v.VentaID})" title="Ver Detalle">👁️</button>
        <button class="btn-sm btn-success" onclick="printFactura(${v.VentaID})" title="Imprimir">🖨️</button>
      </td>
    </tr>
  `).join('');
}

// =============================================
// FILTER
// =============================================

function filterVentas() {
    const fechaInicio = document.getElementById('filter-fecha-inicio').value;
    const fechaFin = document.getElementById('filter-fecha-fin').value;
    const estadoFilter = document.getElementById('filter-estado').value;

    let filtered = ventas.filter(v => {
        const fecha = new Date(v.FechaVenta).toISOString().split('T')[0];

        const matchFecha = (!fechaInicio || fecha >= fechaInicio) && (!fechaFin || fecha <= fechaFin);
        const matchEstado = !estadoFilter || v.NombreEstado === estadoFilter;

        return matchFecha && matchEstado;
    });

    renderVentas(filtered);
}

// =============================================
// POS SYSTEM
// =============================================

function openPOS() {
    posCart = [];
    document.getElementById('pos-search-producto').value = '';
    document.getElementById('pos-cliente').value = '';
    document.getElementById('pos-descuento').value = '0';
    document.getElementById('pos-productos-list').innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Escriba para buscar productos</div>';
    renderPOSCart();
    openModal('modal-pos');
}

function searchProductos() {
    const searchTerm = document.getElementById('pos-search-producto').value.toLowerCase();

    if (!searchTerm) {
        document.getElementById('pos-productos-list').innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Escriba para buscar productos</div>';
        return;
    }

    const filtered = productos.filter(p =>
        p.NombreProducto.toLowerCase().includes(searchTerm) ||
        p.CodigoProducto.toLowerCase().includes(searchTerm)
    );

    const list = document.getElementById('pos-productos-list');

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No se encontraron productos</div>';
        return;
    }

    list.innerHTML = filtered.map(p => `
    <div style="
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: all 0.3s;
    " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'" onclick="addToPOSCart(${p.ProductoID})">
      <div>
        <strong style="color: white; display: block; margin-bottom: 4px;">${p.NombreProducto}</strong>
        <small style="color: rgba(255,255,255,0.6);">${p.CodigoProducto} | Stock: ${p.StockActual}</small>
      </div>
      <div style="text-align: right;">
        <strong style="color: #10b981; font-size: 1.2rem;">${formatCurrency(p.PrecioVentaBs)}</strong>
      </div>
    </div>
  `).join('');
}

function addToPOSCart(productoID) {
    const producto = productos.find(p => p.ProductoID === productoID);
    if (!producto) return;

    if (producto.StockActual <= 0) {
        showToast('Producto sin stock disponible', 'error');
        return;
    }

    const existingItem = posCart.find(item => item.productoID === productoID);

    if (existingItem) {
        if (existingItem.cantidad < producto.StockActual) {
            existingItem.cantidad++;
        } else {
            showToast('No hay más stock disponible', 'warning');
            return;
        }
    } else {
        posCart.push({
            productoID: productoID,
            nombre: producto.NombreProducto,
            precio: producto.PrecioVentaBs,
            cantidad: 1,
            stockMax: producto.StockActual
        });
    }

    renderPOSCart();
    showToast('Producto agregado', 'success');
}

function removeFromPOSCart(productoID) {
    posCart = posCart.filter(item => item.productoID !== productoID);
    renderPOSCart();
}

function updatePOSQuantity(productoID, delta) {
    const item = posCart.find(i => i.productoID === productoID);
    if (!item) return;

    const newQuantity = item.cantidad + delta;

    if (newQuantity <= 0) {
        removeFromPOSCart(productoID);
    } else if (newQuantity <= item.stockMax) {
        item.cantidad = newQuantity;
        renderPOSCart();
    } else {
        showToast('No hay más stock disponible', 'warning');
    }
}

function renderPOSCart() {
    const container = document.getElementById('pos-cart-items');

    if (posCart.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Carrito vacío</div>';
    } else {
        container.innerHTML = posCart.map(item => `
      <div style="
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 10px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <strong style="color: white; font-size: 0.9rem; flex: 1;">${item.nombre}</strong>
          <button onclick="removeFromPOSCart(${item.productoID})" style="
            background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            font-size: 1.2rem;
          ">×</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="updatePOSQuantity(${item.productoID}, -1)" style="
              background: rgba(99,102,241,0.2);
              border: 1px solid #6366f1;
              color: #6366f1;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
            ">-</button>
            <span style="color: white; font-weight: 600; min-width: 20px; text-align: center;">${item.cantidad}</span>
            <button onclick="updatePOSQuantity(${item.productoID}, 1)" style="
              background: rgba(99,102,241,0.2);
              border: 1px solid #6366f1;
              color: #6366f1;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              cursor: pointer;
              font-weight: bold;
            ">+</button>
          </div>
          <strong style="color: #10b981;">${formatCurrency(item.precio * item.cantidad)}</strong>
        </div>
      </div>
    `).join('');
    }

    updatePOSTotal();
}

function updatePOSTotal() {
    const subtotal = posCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const descuentoPorcentaje = parseFloat(document.getElementById('pos-descuento').value) || 0;
    const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
    const total = subtotal - descuentoMonto;

    document.getElementById('pos-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('pos-descuento-monto').textContent = formatCurrency(descuentoMonto);
    document.getElementById('pos-total').textContent = formatCurrency(total);
}

async function procesarVenta() {
    const clienteID = document.getElementById('pos-cliente').value;

    if (!clienteID) {
        showToast('Debe seleccionar un cliente', 'error');
        return;
    }

    if (posCart.length === 0) {
        showToast('El carrito está vacío', 'error');
        return;
    }

    try {
        const descuentoPorcentaje = parseFloat(document.getElementById('pos-descuento').value) || 0;
        const subtotal = posCart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
        const total = subtotal - descuentoMonto;

        // Simulate API call
        // Example: await apiRequest('/admin/ventas', {
        //   method: 'POST',
        //   body: JSON.stringify({ clienteID, items: posCart, descuentoPorcentaje })
        // });

        const newVenta = {
            VentaID: ventas.length + 1,
            NumeroFactura: `FAC-${String(ventas.length + 1).padStart(3, '0')}`,
            FechaVenta: new Date().toISOString(),
            ClienteNombre: clientes.find(c => c.ClienteID == clienteID)?.NombreCompleto,
            CantidadProductos: posCart.reduce((sum, item) => sum + item.cantidad, 0),
            DescuentoPorcentaje: descuentoPorcentaje,
            DescuentoBs: descuentoMonto,
            TotalVentaBs: total,
            NombreEstado: 'Completado'
        };

        ventas.unshift(newVenta);
        renderVentas(ventas);
        updateStats();

        closeModal('modal-pos');
        showToast('✓ Venta procesada exitosamente', 'success');

        // Print option
        if (confirm('¿Desea imprimir la factura?')) {
            printFactura(newVenta.VentaID);
        }
    } catch (err) {
        console.error('Error procesando venta:', err);
        showToast('Error al procesar venta', 'error');
    }
}

// =============================================
// VIEW DETAILS & PRINT
// =============================================

function viewDetalle(ventaID) {
    const venta = ventas.find(v => v.VentaID === ventaID);
    if (!venta) return;

    // Simulated details
    const detalles = [
        { Producto: 'Llanta Michelin Primacy 4', Cantidad: 2, Precio: 850, Subtotal: 1700 }
    ];

    const content = `
    <div style="padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1);">
        <h1 style="color: white; margin-bottom: 10px;">Factura ${venta.NumeroFactura}</h1>
        <p style="color: rgba(255,255,255,0.7);">${formatDateTime(venta.FechaVenta)}</p>
      </div>

      <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px;">
        <strong style="color: white;">Cliente:</strong>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${venta.ClienteNombre}</p>
      </div>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(255,255,255,0.08);">
            <th style="padding: 12px; text-align: left; color: white;">Producto</th>
            <th style="padding: 12px; text-align: center; color: white;">Cant.</th>
            <th style="padding: 12px; text-align: right; color: white;">Precio</th>
            <th style="padding: 12px; text-align: right; color: white;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${detalles.map(d => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 12px; color: rgba(255,255,255,0.9);">${d.Producto}</td>
              <td style="padding: 12px; text-align: center; color: rgba(255,255,255,0.9);">${d.Cantidad}</td>
              <td style="padding: 12px; text-align: right; color: rgba(255,255,255,0.9);">${formatCurrency(d.Precio)}</td>
              <td style="padding: 12px; text-align: right; color: rgba(255,255,255,0.9);"><strong>${formatCurrency(d.Subtotal)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px;">
        ${venta.DescuentoPorcentaje > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: rgba(255,255,255,0.7);">Descuento (${venta.DescuentoPorcentaje}%):</span>
            <strong style="color: #f59e0b;">-${formatCurrency(venta.DescuentoBs)}</strong>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 1.3rem; padding-top: 10px; border-top: 2px solid rgba(255,255,255,0.1);">
          <span style="color: white; font-weight: 600;">TOTAL:</span>
          <strong style="color: #10b981;">${formatCurrency(venta.TotalVentaBs)}</strong>
        </div>
      </div>
    </div>
  `;

    document.getElementById('detalle-venta-content').innerHTML = content;
    openModal('modal-detalle');
}

function printFactura(ventaID) {
    showToast('🖨️ Imprimiendo factura...', 'info');
    // Implement actual print functionality
}

function generateReport() {
    showToast('📊 Generando reporte...', 'info');
    // Implement report generation
}

// =============================================
// STATS
// =============================================

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().substring(0, 7);

    const ventasHoy = ventas.filter(v => v.FechaVenta.startsWith(today));
    const ventasMes = ventas.filter(v => v.FechaVenta.startsWith(thisMonth));

    const totalHoy = ventasHoy.reduce((sum, v) => sum + v.TotalVentaBs, 0);
    const totalMes = ventasMes.reduce((sum, v) => sum + v.TotalVentaBs, 0);

    document.getElementById('stat-ventas-hoy-total').textContent = formatCurrency(totalHoy).replace('Bs ', '');
    document.getElementById('stat-ventas-mes-total').textContent = formatCurrency(totalMes).replace('Bs ', '');
    document.getElementById('stat-top-producto').textContent = 'Llanta Michelin';
}
