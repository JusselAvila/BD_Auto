// =============================================
// SALES & INVOICING MODULE
// Versión con modal profesional de estados
// =============================================

checkAdminAuth();

let ventas = [];
let productos = [];
let clientes = [];
let posCart = [];
let estadosDisponibles = []; // Para el modal
let ventaActualModal = null; // Venta que se está editando

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Cargar estados primero
  await cargarEstados();

  // Cargar ventas inicialmente
  await cargarVentas();
  await cargarEstadisticas();

  // Event Listeners
  document.getElementById('btn-nueva-venta')?.addEventListener('click', abrirModalPOS);
  document.getElementById('btn-reportes')?.addEventListener('click', generarReporte);
  document.getElementById('btn-confirmar-cambio-estado')?.addEventListener('click', confirmarCambioEstado);

  // Filtros
  document.getElementById('filter-fecha-inicio')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filter-fecha-fin')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filter-estado')?.addEventListener('change', aplicarFiltros);
});

// =============================================
// CARGAR ESTADOS DESDE BD
// =============================================
async function cargarEstados() {
  try {
    const response = await apiRequest('/admin/estados-pedido');

    if (!response.ok) {
      throw new Error('Error al cargar estados');
    }

    estadosDisponibles = await response.json();
    console.log('Estados cargados:', estadosDisponibles);
  } catch (error) {
    console.error('Error cargando estados:', error);
    // Estados por defecto si falla
    estadosDisponibles = [
      { EstadoID: 1, NombreEstado: 'Pendiente', Orden: 1 },
      { EstadoID: 2, NombreEstado: 'Confirmado', Orden: 2 },
      { EstadoID: 3, NombreEstado: 'En Preparación', Orden: 3 },
      { EstadoID: 4, NombreEstado: 'En Camino', Orden: 4 },
      { EstadoID: 5, NombreEstado: 'Entregado', Orden: 5 },
      { EstadoID: 6, NombreEstado: 'Cancelado', Orden: 99 }
    ];
  }
}

// =============================================
// LOAD DATA
// =============================================

let ventasGlobal = []; // Para los filtros

async function cargarVentas() {
  const tbody = document.querySelector('#ventas-table tbody');

  try {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;"><div class="spinner"></div><p style="color: rgba(255,255,255,0.6); margin-top: 10px;">Cargando ventas...</p></td></tr>';

    const response = await apiRequest('/admin/ventas');

    if (!response.ok) {
      throw new Error('Error al cargar ventas');
    }

    const ventas = await response.json();
    ventasGlobal = ventas; // Guardar para filtros

    renderizarVentas(ventas);

  } catch (error) {
    console.error('Error:', error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #ef4444;">${error.message}</td></tr>`;
    showToast('Error al cargar ventas', 'error');
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
      'Confirmado': 'badge-info',
      'En Preparación': 'badge-info',
      'En Camino': 'badge-info',
      'Entregado': 'badge-success',
      'Cancelado': 'badge-danger'
    }[venta.Estado] || 'badge-secondary';

    // Calcular descuento total
    const descuentoTotal = venta.DescuentoBs || 0;

    // Determinar si puede cambiar estado
    const puedeEditar = venta.Estado !== 'Entregado' && venta.Estado !== 'Cancelado';

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
                    ${puedeEditar ? `
                        <button class="btn-icon" onclick="abrirModalCambiarEstado(${venta.VentaID}, '${venta.NumeroFactura}', '${venta.NombreCliente}', '${venta.Estado}', ${venta.EstadoID})" title="Cambiar Estado" style="color: #6366f1;">
                            🔄
                        </button>
                    ` : `
                        <span style="color: rgba(255,255,255,0.4); font-size: 0.85rem;">Final</span>
                    `}
                </td>
            </tr>
        `;
  }).join('');
}

// =============================================
// MODAL CAMBIAR ESTADO
// =============================================
function abrirModalCambiarEstado(ventaID, numeroFactura, nombreCliente, estadoActual, estadoActualID) {
  ventaActualModal = {
    ventaID,
    numeroFactura,
    nombreCliente,
    estadoActual,
    estadoActualID
  };

  // Llenar info de la venta
  document.getElementById('modal-factura').textContent = numeroFactura;
  document.getElementById('modal-cliente').textContent = nombreCliente;
  document.getElementById('modal-estado-actual').textContent = estadoActual;
  document.getElementById('modal-estado-actual').className = `badge badge-${getBadgeClass(estadoActual)}`;

  // Limpiar observaciones
  document.getElementById('observaciones-estado').value = '';

  // Renderizar opciones de estados
  renderizarEstadosModal(estadoActualID);

  // Mostrar modal
  document.getElementById('modal-cambiar-estado').style.display = 'flex';
}

function renderizarEstadosModal(estadoActualID) {
  const container = document.querySelector('#estados-opciones .estados-grid');

  container.innerHTML = estadosDisponibles.map(estado => {
    const isActual = estado.EstadoID === estadoActualID;
    const cssClass = getEstadoCssClass(estado.NombreEstado);

    return `
      <div class="estado-badge ${cssClass} ${isActual ? 'disabled' : ''}" 
           data-estado-id="${estado.EstadoID}"
           onclick="${isActual ? '' : `seleccionarEstado(${estado.EstadoID}, '${estado.NombreEstado}')`}"
           style="${isActual ? 'cursor: not-allowed;' : ''}">
        ${estado.NombreEstado}
        ${isActual ? '<br><small>(Actual)</small>' : ''}
      </div>
    `;
  }).join('');
}

let estadoSeleccionado = null;

function seleccionarEstado(estadoID, nombreEstado) {
  // Remover selección anterior
  document.querySelectorAll('.estado-badge').forEach(badge => {
    badge.classList.remove('selected');
  });

  // Seleccionar nuevo
  const badge = document.querySelector(`.estado-badge[data-estado-id="${estadoID}"]`);
  if (badge && !badge.classList.contains('disabled')) {
    badge.classList.add('selected');
    estadoSeleccionado = { estadoID, nombreEstado };
  }
}

function getEstadoCssClass(nombreEstado) {
  const map = {
    'Pendiente': 'estado-pendiente',
    'Confirmado': 'estado-confirmado',
    'En Preparación': 'estado-preparacion',
    'En Camino': 'estado-camino',
    'Entregado': 'estado-entregado',
    'Cancelado': 'estado-cancelado'
  };
  return map[nombreEstado] || 'estado-pendiente';
}

function getBadgeClass(estado) {
  const map = {
    'Pendiente': 'warning',
    'Confirmado': 'info',
    'En Preparación': 'info',
    'En Camino': 'info',
    'Entregado': 'success',
    'Cancelado': 'danger'
  };
  return map[estado] || 'secondary';
}

async function confirmarCambioEstado() {
  if (!estadoSeleccionado) {
    showToast('⚠️ Selecciona un nuevo estado', 'warning');
    return;
  }

  if (!ventaActualModal) {
    showToast('❌ Error: No se encontró la venta', 'error');
    return;
  }

  const observaciones = document.getElementById('observaciones-estado').value.trim() ||
    `Cambiado a ${estadoSeleccionado.nombreEstado} desde panel admin`;

  try {
    const response = await apiRequest(`/admin/ventas/${ventaActualModal.ventaID}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({
        estadoID: estadoSeleccionado.estadoID,
        observaciones: observaciones
      })
    });

    if (!response.ok) {
      throw new Error('Error al cambiar el estado');
    }

    showToast(`✅ Estado cambiado a "${estadoSeleccionado.nombreEstado}"`, 'success');

    // Cerrar modal y resetear
    closeModal('modal-cambiar-estado');
    estadoSeleccionado = null;
    ventaActualModal = null;

    // Recargar ventas
    await cargarVentas();

  } catch (error) {
    console.error('Error:', error);
    showToast('❌ Error al cambiar el estado', 'error');
  }
}

// =============================================
// VER DETALLE DE VENTA
// =============================================
async function verDetalleVenta(ventaID) {
  const modal = document.getElementById('modal-detalle');
  const content = document.getElementById('detalle-venta-content');

  try {
    // Abrir modal y mostrar loading
    modal.style.display = 'flex';
    content.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p style="color: rgba(255,255,255,0.6); margin-top: 10px;">Cargando detalle...</p></div>';

    const response = await apiRequest(`/admin/ventas/${ventaID}/detalle`);

    if (!response.ok) {
      throw new Error('Error al obtener detalle de la venta');
    }

    const data = await response.json();
    const venta = data.venta;
    const productos = data.productos;
    const historial = data.historial || [];

    content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: white; margin-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px;">📋 Información General</h3>
                    <div class="info-group">
                        <p><strong>Nº Factura:</strong> ${venta.NumeroFactura}</p>
                        <p><strong>Fecha:</strong> ${new Date(venta.FechaVenta).toLocaleString('es-BO')}</p>
                        <p><strong>Estado:</strong> <span class="badge badge-${venta.Estado === 'Entregado' ? 'success' : venta.Estado === 'Cancelado' ? 'danger' : 'warning'}">${venta.Estado}</span></p>
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
                        ${productos.map(p => `
                            <tr>
                                <td><code>${p.CodigoProducto}</code></td>
                                <td><strong>${p.NombreProducto}</strong></td>
                                <td>${p.NombreMarca || 'N/A'}</td>
                                <td>${p.Especificaciones || 'N/A'}</td>
                                <td>${p.Cantidad}</td>
                                <td>Bs ${p.PrecioUnitarioBs.toFixed(2)}</td>
                                <td style="color: #f59e0b;">Bs ${(p.DescuentoBs || 0).toFixed(2)}</td>
                                <td><strong>Bs ${p.SubtotalBs.toFixed(2)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px;">
                <div style="min-width: 300px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: rgba(255,255,255,0.7);">Subtotal:</span>
                        <strong style="color: white;">Bs ${(venta.TotalVentaBs + (venta.DescuentoBs || 0)).toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: rgba(255,255,255,0.7);">Descuento Total:</span>
                        <strong style="color: #f59e0b;">- Bs ${(venta.DescuentoBs || 0).toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 1.3rem; padding-top: 10px; border-top: 2px solid rgba(255,255,255,0.1);">
                        <span style="color: white; font-weight: 600;">TOTAL:</span>
                        <strong style="color: #10b981;">Bs ${venta.TotalVentaBs.toFixed(2)}</strong>
                    </div>
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
    showToast('Error al cargar detalle', 'error');
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
  try {
    // Ventas de hoy
    const respHoy = await apiRequest('/admin/stats/ventas-hoy');
    const dataHoy = await respHoy.json();
    document.getElementById('stat-ventas-hoy-total').textContent =
      dataHoy.TotalVentasHoy?.toFixed(2) || '0.00';

    // Ventas del mes
    const respMes = await apiRequest('/admin/stats/ventas-mes');
    const dataMes = await respMes.json();
    document.getElementById('stat-ventas-mes-total').textContent =
      dataMes.TotalVentasMes?.toFixed(2) || '0.00';

    // Producto más vendido
    const respProductos = await apiRequest('/admin/reportes/productos-mas-vendidos');
    const productos = await respProductos.json();
    if (productos.length > 0) {
      document.getElementById('stat-top-producto').textContent =
        productos[0].NombreProducto;
    }

  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    showToast('Error al cargar estadísticas', 'error');
  }
}

// =============================================
// GENERAR REPORTE
// =============================================
function generarReporte() {
  const fechaInicio = document.getElementById('filter-fecha-inicio')?.value || 'Inicio';
  const fechaFin = document.getElementById('filter-fecha-fin')?.value || 'Fin';
  const estado = document.getElementById('filter-estado')?.value || 'Todos';

  showToast(`📊 Generando reporte: ${fechaInicio} - ${fechaFin} (${estado})`, 'info');
  // Aquí puedes implementar la generación de PDF o Excel
}

// =============================================
// IMPRIMIR FACTURA
// =============================================
function imprimirFactura(ventaID) {
  showToast('🖨️ Generando factura PDF...', 'info');
  // Aquí implementarías la generación de PDF
}

// =============================================
// MODAL POS (Para implementar después)
// =============================================
function abrirModalPOS() {
  showToast('🛒 POS se implementará próximamente', 'info');
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
window.abrirModalCambiarEstado = abrirModalCambiarEstado;
window.seleccionarEstado = seleccionarEstado;
window.closeModal = closeModal;