// =============================================
// SALES & INVOICING MODULE
// =============================================

checkAdminAuth();

let ventas = [];
let productos = [];
let clientes = [];
let posCart = [];

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Cargar ventas inicialmente
  await cargarVentas();
  await cargarEstadisticas();

  // Event Listeners
  document.getElementById('btn-nueva-venta')?.addEventListener('click', abrirModalPOS);
  document.getElementById('btn-reportes')?.addEventListener('click', generarReporte);

  // Filtros
  document.getElementById('filter-fecha-inicio')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filter-fecha-fin')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filter-estado')?.addEventListener('change', aplicarFiltros);
});
// =============================================
// LOAD DATA
// =============================================

let ventasGlobal = []; // Para los filtros

async function cargarVentas() {
  const token = localStorage.getItem('authToken');
  const tbody = document.querySelector('#ventas-table tbody');

  try {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;"><div class="spinner"></div><p style="color: rgba(255,255,255,0.6); margin-top: 10px;">Cargando ventas...</p></td></tr>';

    const response = await fetch('/api/admin/ventas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Error al cargar ventas');
    }

    const ventas = await response.json();
    ventasGlobal = ventas; // Guardar para filtros

    renderizarVentas(ventas);

  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #ef4444;">${error.message}</td></tr>`;
  }
}

function renderizarVentas(ventas) {
  const tbody = document.querySelector('#ventas-table tbody');

  if (ventas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No se encontraron ventas</td></tr>';
    return;
  }

  tbody.innerHTML = ventas.map(venta => {
    const estadoClass = {
      'Pendiente': 'badge-warning',
      'Completado': 'badge-success',
      'Cancelado': 'badge-danger',
      'En Proceso': 'badge-info',
      'En Camino': 'badge-info'
    }[venta.Estado] || 'badge-secondary';

    // Calcular descuento total (Promoción + Cupón)
    const descuentoTotal = venta.DescuentoBs || 0;

    return `
            <tr>
                <td><strong>${venta.NumeroFactura}</strong></td>
                <td>${new Date(venta.FechaVenta).toLocaleDateString('es-BO')}</td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <strong>${venta.NombreCliente}</strong>
                        <small style="color: rgba(255,255,255,0.5);">${venta.TipoCliente} - ${venta.TipoDocumento}: ${venta.NumeroDocumento}</small>
                    </div>
                </td>
                <td>${venta.CantidadProductos} item(s)</td>
                <td style="color: #f59e0b;">Bs ${descuentoTotal.toFixed(2)}</td>
                <td><strong style="color: #10b981;">Bs ${venta.TotalVentaBs.toFixed(2)}</strong></td>
                <td><span class="badge ${estadoClass}">${venta.Estado}</span></td>
                <td>
                    <button class="btn-icon" onclick="verDetalleVenta(${venta.VentaID})" title="Ver Detalle">
                        👁️
                    </button>
                    <button class="btn-icon" onclick="imprimirFactura(${venta.VentaID})" title="Imprimir Factura">
                        🖨️
                    </button>
                    ${venta.Estado === 'Pendiente' ? `
                        <button class="btn-icon" onclick="cambiarEstadoVenta(${venta.VentaID}, ${venta.EstadoID}, 'Completado')" title="Marcar Completado">
                            ✅
                        </button>
                        <button class="btn-icon" onclick="cambiarEstadoVenta(${venta.VentaID}, ${venta.EstadoID}, 'Cancelado')" title="Cancelar">
                            ❌
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
  }).join('');
}

// =============================================
// VER DETALLE DE VENTA
// =============================================
async function verDetalleVenta(ventaID) {
  const token = localStorage.getItem('authToken');
  const modal = document.getElementById('modal-detalle');
  const content = document.getElementById('detalle-venta-content');

  try {
    // Abrir modal y mostrar loading
    modal.style.display = 'flex';
    content.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p style="color: rgba(255,255,255,0.6); margin-top: 10px;">Cargando detalle...</p></div>';

    const response = await fetch(`/api/admin/ventas/${ventaID}/detalle`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Error al obtener detalle de la venta');
    }

    const data = await response.json();
    const venta = data.venta;
    const productos = data.productos;
    const historial = data.historial || []; // Opcional

    content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: white; margin-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">📋 Información General</h3>
                    <div class="info-group">
                        <p><strong>Nº Factura:</strong> ${venta.NumeroFactura}</p>
                        <p><strong>Fecha:</strong> ${new Date(venta.FechaVenta).toLocaleString('es-BO')}</p>
                        <p><strong>Estado:</strong> <span class="badge badge-${venta.Estado === 'Completado' ? 'success' : venta.Estado === 'Cancelado' ? 'danger' : 'warning'}">${venta.Estado}</span></p>
                        <p><strong>Método de Pago:</strong> ${venta.MetodoPago}</p>
                        ${venta.CodigoSeguimiento ? `<p><strong>Código Seguimiento:</strong> <code>${venta.CodigoSeguimiento}</code></p>` : ''}
                        ${venta.Observaciones ? `<p><strong>Observaciones:</strong> ${venta.Observaciones}</p>` : ''}
                        ${venta.CodigoCupon ? `<p><strong>Cupón Aplicado:</strong> <code>${venta.CodigoCupon}</code> (${venta.DescripcionCupon || 'N/A'})</p>` : ''}
                    </div>
                </div>
                
                <div>
                    <h3 style="color: white; margin-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">👤 Cliente</h3>
                    <div class="info-group">
                        <p><strong>Nombre:</strong> ${venta.NombreCliente}</p>
                        <p><strong>${venta.TipoDocumento}:</strong> ${venta.DocumentoCliente}</p>
                        <p><strong>Tipo:</strong> ${venta.TipoCliente}</p>
                    </div>
                    
                    <h3 style="color: white; margin: 20px 0 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">📍 Dirección de Envío</h3>
                    <div class="info-group">
                        <p>${venta.Direccion}</p>
                        <p>${venta.NombreCiudad}, ${venta.NombreDepartamento}</p>
                        ${venta.ReferenciaDir ? `<p><em>Ref: ${venta.ReferenciaDir}</em></p>` : ''}
                    </div>
                </div>
            </div>
            
            <h3 style="color: white; margin-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">📦 Productos</h3>
            <div class="table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Marca</th>
                            <th>Especificaciones</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Descuento</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productos.map(prod => `
                            <tr>
                                <td><code>${prod.CodigoProducto}</code></td>
                                <td><strong>${prod.NombreProducto}</strong></td>
                                <td>${prod.NombreMarca || 'N/A'}</td>
                                <td>${prod.Especificaciones}</td>
                                <td>${prod.Cantidad}</td>
                                <td>Bs ${prod.PrecioUnitarioBs.toFixed(2)}</td>
                                <td style="color: #f59e0b;">Bs ${prod.DescuentoProducto.toFixed(2)}</td>
                                <td><strong style="color: #10b981;">Bs ${prod.SubtotalBs.toFixed(2)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: rgba(255,255,255,0.7);">Subtotal:</span>
                    <strong style="color: white;">Bs ${venta.SubtotalVentaBs.toFixed(2)}</strong>
                </div>
                ${venta.DescuentoPromocionBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: rgba(255,255,255,0.7);">Descuento Promoción:</span>
                    <strong style="color: #f59e0b;">- Bs ${venta.DescuentoPromocionBs.toFixed(2)}</strong>
                </div>
                ` : ''}
                ${venta.DescuentoCuponBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: rgba(255,255,255,0.7);">Descuento Cupón:</span>
                    <strong style="color: #f59e0b;">- Bs ${venta.DescuentoCuponBs.toFixed(2)}</strong>
                </div>
                ` : ''}
                ${venta.CostoEnvioBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: rgba(255,255,255,0.7);">Costo de Envío:</span>
                    <strong style="color: white;">+ Bs ${venta.CostoEnvioBs.toFixed(2)}</strong>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 1.3rem; padding-top: 10px; border-top: 2px solid rgba(255,255,255,0.1);">
                    <span style="color: white; font-weight: 600;">TOTAL:</span>
                    <strong style="color: #10b981;">Bs ${venta.TotalVentaBs.toFixed(2)}</strong>
                </div>
            </div>
            
            ${historial.length > 0 ? `
                <h3 style="color: white; margin: 30px 0 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">📅 Historial de Estados</h3>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
                    ${historial.map(h => `
                        <div style="padding: 10px; border-left: 3px solid #10b981; margin-bottom: 10px; background: rgba(255,255,255,0.02);">
                            <div style="display: flex; justify-content: space-between;">
                                <strong style="color: white;">${h.NombreEstado}</strong>
                                <span style="color: rgba(255,255,255,0.5); font-size: 0.9rem;">${new Date(h.FechaCambio).toLocaleString('es-BO')}</span>
                            </div>
                            ${h.Comentario ? `<p style="color: rgba(255,255,255,0.7); margin: 5px 0 0 0; font-size: 0.9rem;">${h.Comentario}</p>` : ''}
                            ${h.Usuario ? `<p style="color: rgba(255,255,255,0.5); margin: 5px 0 0 0; font-size: 0.85rem;">Por: ${h.Usuario}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            ${venta.UsuarioQueRegistro ? `
                <p style="text-align: center; color: rgba(255,255,255,0.5); margin-top: 20px; font-size: 0.9rem;">
                    Registrado por: ${venta.UsuarioQueRegistro}
                </p>
            ` : ''}
        `;

  } catch (error) {
    console.error('Error:', error);
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: #ef4444;">${error.message}</div>`;
  }
}

// =============================================
// APLICAR FILTROS
// =============================================
function aplicarFiltros() {
  const fechaInicio = document.getElementById('filter-fecha-inicio')?.value;
  const fechaFin = document.getElementById('filter-fecha-fin')?.value;
  const estadoFiltro = document.getElementById('filter-estado')?.value;

  let ventasFiltradas = [...ventasGlobal];

  // Filtro por fecha inicio
  if (fechaInicio) {
    ventasFiltradas = ventasFiltradas.filter(v =>
      new Date(v.FechaVenta) >= new Date(fechaInicio)
    );
  }

  // Filtro por fecha fin
  if (fechaFin) {
    ventasFiltradas = ventasFiltradas.filter(v =>
      new Date(v.FechaVenta) <= new Date(fechaFin + 'T23:59:59')
    );
  }

  // Filtro por estado
  if (estadoFiltro) {
    ventasFiltradas = ventasFiltradas.filter(v =>
      v.Estado === estadoFiltro
    );
  }

  renderizarVentas(ventasFiltradas);
}

// =============================================
// ESTADÍSTICAS
// =============================================
async function cargarEstadisticas() {
  const token = localStorage.getItem('authToken');

  try {
    // Ventas de hoy
    const respHoy = await fetch('/api/admin/stats/ventas-hoy', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataHoy = await respHoy.json();
    document.getElementById('stat-ventas-hoy-total').textContent =
      dataHoy.TotalVentasHoy?.toFixed(2) || '0.00';

    // Ventas del mes
    const respMes = await fetch('/api/admin/stats/ventas-mes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataMes = await respMes.json();
    document.getElementById('stat-ventas-mes-total').textContent =
      dataMes.TotalVentasMes?.toFixed(2) || '0.00';

    // Producto más vendido
    const respProductos = await fetch('/api/admin/reportes/productos-mas-vendidos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const productos = await respProductos.json();
    if (productos.length > 0) {
      document.getElementById('stat-top-producto').textContent =
        productos[0].NombreProducto;
    }

  } catch (error) {
    console.error('Error cargando estadísticas:', error);
  }
}

// =============================================
// GENERAR REPORTE
// =============================================
function generarReporte() {
  const fechaInicio = document.getElementById('filter-fecha-inicio')?.value || 'Inicio';
  const fechaFin = document.getElementById('filter-fecha-fin')?.value || 'Fin';
  const estado = document.getElementById('filter-estado')?.value || 'Todos';

  alert(`Generando reporte de ventas:\n\nPeríodo: ${fechaInicio} - ${fechaFin}\nEstado: ${estado}\n\nEsta funcionalidad se implementará próximamente.`);
}

// =============================================
// IMPRIMIR FACTURA
// =============================================
function imprimirFactura(ventaID) {
  alert(`Imprimiendo factura para VentaID: ${ventaID}\n\nEsta funcionalidad se implementará próximamente con generación de PDF.`);
}

// =============================================
// CAMBIAR ESTADO DE VENTA
// =============================================
async function cambiarEstadoVenta(ventaID, estadoActualID, nuevoEstadoNombre) {
  const token = localStorage.getItem('authToken');

  // Mapeo de nombres a IDs (ajusta según tus datos reales en EstadosPedido)
  const estadosMap = {
    'Completado': 3,  // Ajusta estos IDs según tu tabla EstadosPedido
    'Cancelado': 4
  };

  const nuevoEstadoID = estadosMap[nuevoEstadoNombre];

  if (!nuevoEstadoID) {
    alert('Estado no válido');
    return;
  }

  if (!confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstadoNombre}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/ventas/${ventaID}/estado`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estadoID: nuevoEstadoID,
        observaciones: `Cambiado a ${nuevoEstadoNombre} desde panel de admin`
      })
    });

    if (!response.ok) {
      throw new Error('Error al cambiar el estado');
    }

    alert(`Estado cambiado exitosamente a "${nuevoEstadoNombre}"`);

    // Recargar ventas
    await cargarVentas();

  } catch (error) {
    console.error('Error:', error);
    alert('Error al cambiar el estado de la venta');
  }
}

// =============================================
// MODAL POS (Para implementar después)
// =============================================
function abrirModalPOS() {
  alert('El punto de venta (POS) se implementará próximamente.\n\nPor ahora, las ventas se realizan desde el sitio web del cliente.');
}

// =============================================
// HELPERS
// =============================================
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Hacer funciones globales para los onclick en el HTML
window.verDetalleVenta = verDetalleVenta;
window.imprimirFactura = imprimirFactura;
window.cambiarEstadoVenta = cambiarEstadoVenta;
window.closeModal = closeModal;
