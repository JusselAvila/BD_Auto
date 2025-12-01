document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
    console.log('Token en historial.js:', token);
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const historialContainer = document.getElementById('historial-compras-container');

    fetch('/api/ventas/historial', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al obtener el historial de compras');
        }
        return response.json();
    })
    .then(historial => {
        if (historial.length === 0) {
            historialContainer.innerHTML = '<p>No has realizado ninguna compra todavía.</p>';
            return;
        }

        let html = '<table>';
        html += '<thead><tr><th>Nº Factura</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Productos</th></tr></thead>';
        html += '<tbody>';

        historial.forEach(compra => {
            html += `
                <tr>
                    <td>${compra.NumeroFactura}</td>
                    <td>${new Date(compra.FechaVenta).toLocaleDateString()}</td>
                    <td>Bs. ${compra.TotalVentaBs.toFixed(2)}</td>
                    <td>${compra.NombreEstado}</td>
                    <td>${compra.CantidadProductos}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        historialContainer.innerHTML = html;
    })
    .catch(error => {
        console.error('Error:', error);
        historialContainer.innerHTML = `<p class="error">${error.message}</p>`;
    });
});
