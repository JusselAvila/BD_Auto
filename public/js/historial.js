// =============================================
// HISTORIAL DE COMPRAS - CLIENTE
// Adaptado para usar styles.css existente
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    await cargarHistorialCompras();
});

// =============================================
// CARGAR HISTORIAL DE COMPRAS
// =============================================
async function cargarHistorialCompras() {
    const token = localStorage.getItem('authToken');
    const container = document.getElementById('historial-compras-container');

    try {
        // Mostrar loading
        container.innerHTML = `
            <div class="empty-message">
                <p style="font-size: 3rem; margin-bottom: 20px;">⏳</p>
                <p style="font-size: 1.2rem;">Cargando historial de compras...</p>
            </div>
        `;

        const response = await fetch('/api/ventas/historial', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al obtener el historial de compras');
        }

        const historial = await response.json();

        if (historial.length === 0) {
            container.innerHTML = `
                <div class="empty-message">
                    <p style="font-size: 4rem; margin-bottom: 20px;">🛒</p>
                    <p style="font-size: 1.3rem; margin-bottom: 10px;">No hay compras registradas</p>
                    <p>Aún no has realizado ninguna compra. ¡Explora nuestro catálogo!</p>
                    <a href="index.html" class="btn-primary btn-large mt-20">🔍 Ver Productos</a>
                </div>
            `;
            return;
        }

        renderizarHistorial(historial);

    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-message">
                <p style="font-size: 3rem; margin-bottom: 20px;">⚠️</p>
                <p style="color: var(--danger); font-size: 1.1rem;">${error.message}</p>
                <button onclick="cargarHistorialCompras()" class="btn-secondary mt-20">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

// =============================================
// RENDERIZAR HISTORIAL
// =============================================
function renderizarHistorial(historial) {
    const container = document.getElementById('historial-compras-container');

    // Estadísticas usando glass-card
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="glass-card" style="text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🛍️</div>
                <div style="font-size: 2rem; font-weight: 800; color: white; margin-bottom: 5px;">
                    ${historial.length}
                </div>
                <div style="color: rgba(255,255,255,0.7);">Compras Totales</div>
            </div>
            <div class="glass-card" style="text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">💰</div>
                <div style="font-size: 2rem; font-weight: 800; color: white; margin-bottom: 5px;">
                    Bs ${historial.reduce((sum, v) => sum + v.TotalVentaBs, 0).toFixed(2)}
                </div>
                <div style="color: rgba(255,255,255,0.7);">Total Gastado</div>
            </div>
            <div class="glass-card" style="text-align: center;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">📦</div>
                <div style="font-size: 2rem; font-weight: 800; color: white; margin-bottom: 5px;">
                    ${historial.reduce((sum, v) => sum + v.CantidadProductos, 0)}
                </div>
                <div style="color: rgba(255,255,255,0.7);">Productos Comprados</div>
            </div>
        </div>

        <div id="compras-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
    `;

    historial.forEach((compra, index) => {
        const estadoConfig = {
            'Pendiente': { color: 'var(--warning)', icon: '⏳', bg: 'rgba(245, 158, 11, 0.2)' },
            'En Proceso': { color: 'var(--primary)', icon: '⚙️', bg: 'rgba(99, 102, 241, 0.2)' },
            'En Camino': { color: '#8b5cf6', icon: '🚚', bg: 'rgba(139, 92, 246, 0.2)' },
            'Completado': { color: 'var(--success)', icon: '✅', bg: 'rgba(16, 185, 129, 0.2)' },
            'Cancelado': { color: 'var(--danger)', icon: '❌', bg: 'rgba(239, 68, 68, 0.2)' }
        };

        const estado = estadoConfig[compra.NombreEstado] || estadoConfig['Pendiente'];

        html += `
            <div class="producto-item" style="animation-delay: ${index * 0.1}s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="color: white; font-size: 1.1rem; margin: 0 0 5px 0;">
                            🧾 ${compra.NumeroFactura}
                        </h3>
                        <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0;">
                            📅 ${new Date(compra.FechaVenta).toLocaleDateString('es-BO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })}
                        </p>
                    </div>
                    <span style="padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; background: ${estado.bg}; color: ${estado.color}; border: 1px solid ${estado.color}; white-space: nowrap;">
                        ${estado.icon} ${compra.NombreEstado}
                    </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                    <div class="producto-marca">
                        💳 ${compra.MetodoPago}
                    </div>
                    <div class="producto-categoria">
                        📦 ${compra.CantidadProductos} producto(s)
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 1.5rem; font-weight: 800; color: var(--success);">
                        💰 Bs ${compra.TotalVentaBs.toFixed(2)}
                    </div>
                </div>

                <button class="btn-primary btn-block" onclick="verDetalleCompra(${compra.VentaID})">
                    👁️ Ver Detalle Completo
                </button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// =============================================
// VER DETALLE DE COMPRA
// =============================================
async function verDetalleCompra(ventaID) {
    const token = localStorage.getItem('authToken');
    const modal = document.getElementById('modal-detalle');
    const content = document.getElementById('detalle-venta');

    try {
        // Mostrar modal con loading
        modal.classList.add('active');
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="font-size: 3rem; margin-bottom: 20px;">⏳</p>
                <p style="color: rgba(255,255,255,0.8);">Cargando detalle...</p>
            </div>
        `;

        const response = await fetch(`/api/ventas/${ventaID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al obtener el detalle de la compra');
        }

        const data = await response.json();
        renderizarDetalle(data);

    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="font-size: 3rem; margin-bottom: 20px;">⚠️</p>
                <p style="color: var(--danger); font-size: 1.1rem;">${error.message}</p>
            </div>
        `;
    }
}

// =============================================
// RENDERIZAR DETALLE DE COMPRA
// =============================================
function renderizarDetalle(data) {
    const { venta, detalles } = data;
    const content = document.getElementById('detalle-venta');

    const estadoConfig = {
        'Pendiente': { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.2)' },
        'En Proceso': { color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.2)' },
        'En Camino': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },
        'Completado': { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.2)' },
        'Cancelado': { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.2)' }
    };

    const estado = estadoConfig[venta.NombreEstado] || estadoConfig['Pendiente'];

    content.innerHTML = `
        <!-- Encabezado -->
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1);">
            <div>
                <h3 style="margin: 0 0 10px 0; color: white; font-size: 1.5rem;">
                    🧾 ${venta.NumeroFactura}
                </h3>
                <p style="margin: 0; color: rgba(255,255,255,0.6);">
                    📅 ${new Date(venta.FechaVenta).toLocaleString('es-BO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}
                </p>
            </div>
            <span style="padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600; background: ${estado.bg}; color: ${estado.color}; border: 1px solid ${estado.color};">
                ${venta.NombreEstado}
            </span>
        </div>

        <!-- Información General -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div class="glass-card">
                <h3 style="color: white; margin-bottom: 15px;">💳 Información de Pago</h3>
                <p style="color: rgba(255,255,255,0.8); margin-bottom: 10px;">
                    <strong>Método:</strong> ${venta.MetodoPago}
                </p>
                ${venta.CodigoSeguimiento ? `
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 10px;">
                        <strong>🚚 Código de Seguimiento:</strong><br>
                        <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px;">${venta.CodigoSeguimiento}</code>
                    </p>
                ` : ''}
            </div>

            <div class="glass-card">
                <h3 style="color: white; margin-bottom: 15px;">📍 Dirección de Envío</h3>
                <p style="color: rgba(255,255,255,0.8); line-height: 1.6;">
                    ${venta.DireccionCompleta}
                </p>
            </div>
        </div>

        ${venta.Observaciones ? `
            <div class="glass-card" style="margin-bottom: 30px;">
                <h3 style="color: white; margin-bottom: 10px;">📝 Observaciones</h3>
                <p style="color: rgba(255,255,255,0.8); font-style: italic;">
                    ${venta.Observaciones}
                </p>
            </div>
        ` : ''}

        <!-- Productos -->
        <div class="glass-card" style="margin-bottom: 30px;">
            <h3 style="color: white; margin-bottom: 15px;">📦 Productos Comprados</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid rgba(255,255,255,0.2);">
                            <th style="padding: 12px; text-align: left; color: white; font-weight: 600;">Código</th>
                            <th style="padding: 12px; text-align: left; color: white; font-weight: 600;">Producto</th>
                            <th style="padding: 12px; text-align: center; color: white; font-weight: 600;">Cant.</th>
                            <th style="padding: 12px; text-align: right; color: white; font-weight: 600;">Precio Unit.</th>
                            <th style="padding: 12px; text-align: right; color: white; font-weight: 600;">Descuento</th>
                            <th style="padding: 12px; text-align: right; color: white; font-weight: 600;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalles.map(producto => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <td style="padding: 12px; color: rgba(255,255,255,0.8);">
                                    <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px;">${producto.CodigoProducto}</code>
                                </td>
                                <td style="padding: 12px; color: white; font-weight: 600;">
                                    ${producto.NombreProducto}
                                </td>
                                <td style="padding: 12px; text-align: center; color: rgba(255,255,255,0.8);">
                                    ${producto.Cantidad}
                                </td>
                                <td style="padding: 12px; text-align: right; color: rgba(255,255,255,0.8);">
                                    Bs ${producto.PrecioUnitarioBs.toFixed(2)}
                                </td>
                                <td style="padding: 12px; text-align: right; color: var(--warning);">
                                    Bs ${producto.DescuentoBs.toFixed(2)}
                                </td>
                                <td style="padding: 12px; text-align: right; color: var(--success); font-weight: 700;">
                                    Bs ${producto.SubtotalBs.toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Resumen Financiero -->
        <div class="glass-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: rgba(255,255,255,0.8);">
                <span>Subtotal:</span>
                <strong style="color: white;">Bs ${venta.SubtotalVentaBs.toFixed(2)}</strong>
            </div>
            ${venta.DescuentoPromocionBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: rgba(255,255,255,0.8);">
                    <span>Descuento Promoción:</span>
                    <strong style="color: var(--warning);">- Bs ${venta.DescuentoPromocionBs.toFixed(2)}</strong>
                </div>
            ` : ''}
            ${venta.DescuentoCuponBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: rgba(255,255,255,0.8);">
                    <span>Descuento Cupón:</span>
                    <strong style="color: var(--warning);">- Bs ${venta.DescuentoCuponBs.toFixed(2)}</strong>
                </div>
            ` : ''}
            ${venta.CostoEnvioBs > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: rgba(255,255,255,0.8);">
                    <span>Costo de Envío:</span>
                    <strong style="color: white;">+ Bs ${venta.CostoEnvioBs.toFixed(2)}</strong>
                </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 1.5rem; padding-top: 15px; margin-top: 15px; border-top: 2px solid rgba(255,255,255,0.2);">
                <span style="color: white; font-weight: 700;">TOTAL:</span>
                <strong style="color: var(--success); font-size: 2rem;">Bs ${venta.TotalVentaBs.toFixed(2)}</strong>
            </div>
        </div>

        <!-- Botones de Acción -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px;">
            <button onclick="imprimirFactura(${venta.VentaID})" class="btn-primary">
                🖨️ Imprimir Factura
            </button>
            <button onclick="descargarPDF(${venta.VentaID})" class="btn-secondary">
                📄 Descargar PDF
            </button>
        </div>
    `;
}

// =============================================
// CERRAR MODAL
// =============================================
function cerrarModal() {
    document.getElementById('modal-detalle').classList.remove('active');
}

// =============================================
// IMPRIMIR FACTURA
// =============================================
function imprimirFactura(ventaID) {
    alert('Funcionalidad de impresión en desarrollo.\n\nVentaID: ' + ventaID);
    // TODO: Implementar generación de PDF para impresión
}

// =============================================
// DESCARGAR PDF
// =============================================
function descargarPDF(ventaID) {
    alert('Funcionalidad de descarga en desarrollo.\n\nVentaID: ' + ventaID);
    // TODO: Implementar generación y descarga de PDF
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const btnCerrar = document.getElementById('cerrar-modal');
    const modal = document.getElementById('modal-detalle');

    if (btnCerrar) {
        btnCerrar.addEventListener('click', cerrarModal);
    }

    // Cerrar modal al hacer clic fuera del contenido
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }
});

// Hacer funciones globales
window.verDetalleCompra = verDetalleCompra;
window.cerrarModal = cerrarModal;
window.imprimirFactura = imprimirFactura;
window.descargarPDF = descargarPDF;
window.cargarHistorialCompras = cargarHistorialCompras;