// =============================================
// PRODUCT MANAGEMENT MODULE
// =============================================

checkAdminAuth();

let productos = [];
let categorias = [];
let marcas = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadCategorias();
    await loadMarcas();
    await loadProductos();
    setupEventListeners();
});

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Nueva producto button
    document.getElementById('btn-nuevo-producto').addEventListener('click', () => {
        resetProductoForm();
        document.getElementById('modal-producto-title').textContent = 'Nuevo Producto';
        openModal('modal-producto');
    });

    // Search
    document.getElementById('search-productos').addEventListener('input', filterProductos);
    document.getElementById('filter-categoria').addEventListener('change', filterProductos);
    document.getElementById('filter-stock').addEventListener('change', filterProductos);

    // Form submit - Producto
    document.getElementById('form-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProducto();
    });

    // Form submit - Stock
    document.getElementById('form-stock').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateStock();
    });
}

// =============================================
// LOAD DATA
// =============================================

async function loadCategorias() {
    try {
        // Simulated - replace with actual API
        categorias = [
            { CategoriaID: 1, NombreCategoria: 'Llantas' },
            { CategoriaID: 2, NombreCategoria: 'Neumáticos' },
            { CategoriaID: 3, NombreCategoria: 'Accesorios' }
        ];

        const select = document.getElementById('producto-categoria');
        const filter = document.getElementById('filter-categoria');

        categorias.forEach(cat => {
            select.innerHTML += `<option value="${cat.CategoriaID}">${cat.NombreCategoria}</option>`;
            filter.innerHTML += `<option value="${cat.CategoriaID}">${cat.NombreCategoria}</option>`;
        });
    } catch (err) {
        console.error('Error loading categorias:', err);
    }
}

async function loadMarcas() {
    try {
        // Simulated - replace with actual API
        marcas = [
            { MarcaID: 1, NombreMarca: 'Michelin' },
            { MarcaID: 2, NombreMarca: 'Goodyear' },
            { MarcaID: 3, NombreMarca: 'Bridgestone' },
            { MarcaID: 4, NombreMarca: 'Pirelli' }
        ];

        const select = document.getElementById('producto-marca');
        marcas.forEach(marca => {
            select.innerHTML += `<option value="${marca.MarcaID}">${marca.NombreMarca}</option>`;
        });
    } catch (err) {
        console.error('Error loading marcas:', err);
    }
}

async function loadProductos() {
    try {
        showLoading('#productos-table tbody');

        // Simulated data - replace with actual API call
        // Example: const response = await apiRequest('/admin/productos');
        // productos = await response.json();

        productos = [
            {
                ProductoID: 1,
                CodigoProducto: 'LLA-001',
                NombreProducto: 'Llanta Michelin Primacy 4',
                CategoriaID: 1,
                NombreCategoria: 'Llantas',
                MarcaID: 1,
                NombreMarca: 'Michelin',
                PrecioVentaBs: 850.00,
                PrecioCompraBs: 600.00,
                StockActual: 25,
                StockMinimo: 10,
                Activo: 1,
                Destacado: 1,
                Descripcion: 'Llanta de alta performance para sedanes',
                Ancho: 205,
                Perfil: 55,
                DiametroRin: 16
            },
            {
                ProductoID: 2,
                CodigoProducto: 'LLA-002',
                NombreProducto: 'Llanta Goodyear Eagle F1',
                CategoriaID: 1,
                NombreCategoria: 'Llantas',
                MarcaID: 2,
                NombreMarca: 'Goodyear',
                PrecioVentaBs: 920.00,
                PrecioCompraBs: 680.00,
                StockActual: 5,
                StockMinimo: 10,
                Activo: 1,
                Destacado: 0,
                Descripcion: 'Llanta deportiva de alto rendimiento',
                Ancho: 225,
                Perfil: 45,
                DiametroRin: 17
            },
            {
                ProductoID: 3,
                CodigoProducto: 'LLA-003',
                NombreProducto: 'Llanta Bridgestone Turanza',
                CategoriaID: 1,
                NombreCategoria: 'Llantas',
                MarcaID: 3,
                NombreMarca: 'Bridgestone',
                PrecioVentaBs: 780.00,
                PrecioCompraBs: 550.00,
                StockActual: 0,
                StockMinimo: 8,
                Activo: 1,
                Destacado: 0,
                Descripcion: 'Llanta confort para uso urbano',
                Ancho: 195,
                Perfil: 65,
                DiametroRin: 15
            }
        ];

        renderProductos(productos);
    } catch (err) {
        console.error('Error loading productos:', err);
        showError('#productos-table tbody', 'Error al cargar productos');
        showToast('Error al cargar productos', 'error');
    }
}

// =============================================
// RENDER
// =============================================

function renderProductos(data) {
    const tbody = document.querySelector('#productos-table tbody');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No se encontraron productos</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => {
        const stockClass = p.StockActual === 0 ? 'badge-danger' :
            p.StockActual <= p.StockMinimo ? 'badge-warning' :
                'badge-success';

        const stockText = p.StockActual === 0 ? 'Agotado' :
            p.StockActual <= p.StockMinimo ? 'Stock Bajo' :
                'Disponible';

        return `
      <tr>
        <td><strong>${p.CodigoProducto}</strong></td>
        <td>
          <strong>${p.NombreProducto}</strong>
          ${p.Destacado ? '<span style="color: #fbbf24;">⭐</span>' : ''}
          ${p.Descripcion ? `<br><small style="color: rgba(255,255,255,0.6);">${p.Descripcion.substring(0, 50)}${p.Descripcion.length > 50 ? '...' : ''}</small>` : ''}
        </td>
        <td>${p.NombreCategoria}</td>
        <td>${p.NombreMarca}</td>
        <td><strong>${formatCurrency(p.PrecioVentaBs)}</strong></td>
        <td>
          <strong style="font-size: 1.1rem; color: ${p.StockActual > p.StockMinimo ? '#10b981' : p.StockActual > 0 ? '#f59e0b' : '#ef4444'}">
            ${p.StockActual}
          </strong>
        </td>
        <td><span class="badge ${stockClass}">${stockText}</span></td>
        <td>
          <button class="btn-sm btn-primary" onclick="editProducto(${p.ProductoID})" title="Editar">✏️</button>
          <button class="btn-sm btn-success" onclick="openStockModal(${p.ProductoID})" title="Ajustar Stock">📦</button>
          <button class="btn-sm btn-danger" onclick="deleteProducto(${p.ProductoID})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
    }).join('');
}

// =============================================
// FILTER
// =============================================

function filterProductos() {
    const searchTerm = document.getElementById('search-productos').value.toLowerCase();
    const categoriaFilter = document.getElementById('filter-categoria').value;
    const stockFilter = document.getElementById('filter-stock').value;

    let filtered = productos.filter(p => {
        const matchSearch = !searchTerm ||
            p.NombreProducto.toLowerCase().includes(searchTerm) ||
            p.CodigoProducto.toLowerCase().includes(searchTerm) ||
            (p.Descripcion && p.Descripcion.toLowerCase().includes(searchTerm));

        const matchCategoria = !categoriaFilter || p.CategoriaID == categoriaFilter;

        let matchStock = true;
        if (stockFilter === 'disponible') {
            matchStock = p.StockActual > p.StockMinimo;
        } else if (stockFilter === 'bajo') {
            matchStock = p.StockActual > 0 && p.StockActual <= p.StockMinimo;
        } else if (stockFilter === 'agotado') {
            matchStock = p.StockActual === 0;
        }

        return matchSearch && matchCategoria && matchStock;
    });

    renderProductos(filtered);
}

// =============================================
// CRUD OPERATIONS
// =============================================

function resetProductoForm() {
    document.getElementById('form-producto').reset();
    document.getElementById('producto-id').value = '';
}

function editProducto(id) {
    const producto = productos.find(p => p.ProductoID === id);
    if (!producto) return;

    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    document.getElementById('producto-id').value = producto.ProductoID;
    document.getElementById('producto-codigo').value = producto.CodigoProducto;
    document.getElementById('producto-nombre').value = producto.NombreProducto;
    document.getElementById('producto-categoria').value = producto.CategoriaID;
    document.getElementById('producto-marca').value = producto.MarcaID;
    document.getElementById('producto-precio-compra').value = producto.PrecioCompraBs;
    document.getElementById('producto-precio-venta').value = producto.PrecioVentaBs;
    document.getElementById('producto-stock').value = producto.StockActual;
    document.getElementById('producto-stock-minimo').value = producto.StockMinimo;
    document.getElementById('producto-ancho').value = producto.Ancho || '';
    document.getElementById('producto-perfil').value = producto.Perfil || '';
    document.getElementById('producto-diametro').value = producto.DiametroRin || '';
    document.getElementById('producto-descripcion').value = producto.Descripcion || '';
    document.getElementById('producto-destacado').checked = producto.Destacado === 1;

    openModal('modal-producto');
}

async function saveProducto() {
    try {
        const formData = new FormData(document.getElementById('form-producto'));
        const data = Object.fromEntries(formData.entries());

        data.destacado = document.getElementById('producto-destacado').checked ? 1 : 0;
        data.activo = 1;

        const productoID = document.getElementById('producto-id').value;

        if (productoID) {
            // UPDATE
            // Example: await apiRequest(`/admin/productos/${productoID}`, {
            //   method: 'PUT',
            //   body: JSON.stringify(data)
            // });

            const index = productos.findIndex(p => p.ProductoID == productoID);
            if (index !== -1) {
                productos[index] = { ...productos[index], ...data };
            }

            showToast('✓ Producto actualizado exitosamente', 'success');
        } else {
            // CREATE
            // Example: await apiRequest('/admin/productos', {
            //   method: 'POST',
            //   body: JSON.stringify(data)
            // });

            const newId = Math.max(...productos.map(p => p.ProductoID), 0) + 1;
            const categoria = categorias.find(c => c.CategoriaID == data.categoriaID);
            const marca = marcas.find(m => m.MarcaID == data.marcaID);

            productos.push({
                ProductoID: newId,
                ...data,
                NombreCategoria: categoria?.NombreCategoria,
                NombreMarca: marca?.NombreMarca,
                Activo: 1
            });

            showToast('✓ Producto creado exitosamente', 'success');
        }

        await loadProductos();
        closeModal('modal-producto');
        resetProductoForm();
    } catch (err) {
        console.error('Error saving producto:', err);
        showToast('❌ Error al guardar producto', 'error');
    }
}

async function deleteProducto(id) {
    if (!confirm('¿Está seguro que desea eliminar este producto?')) {
        return;
    }

    try {
        // Example: await apiRequest(`/admin/productos/${id}`, { method: 'DELETE' });

        const index = productos.findIndex(p => p.ProductoID === id);
        if (index !== -1) {
            productos.splice(index, 1);
        }

        await loadProductos();
        showToast('✓ Producto eliminado exitosamente', 'success');
    } catch (err) {
        console.error('Error deleting producto:', err);
        showToast('❌ Error al eliminar producto', 'error');
    }
}

// =============================================
// STOCK MANAGEMENT
// =============================================

function openStockModal(id) {
    const producto = productos.find(p => p.ProductoID === id);
    if (!producto) return;

    document.getElementById('stock-producto-id').value = producto.ProductoID;
    document.getElementById('stock-producto-nombre').textContent = producto.NombreProducto;
    document.getElementById('stock-actual').textContent = producto.StockActual + ' unidades';
    document.getElementById('stock-cantidad').value = '';
    document.getElementById('stock-observacion').value = '';

    openModal('modal-stock');
}

async function updateStock() {
    try {
        const productoID = document.getElementById('stock-producto-id').value;
        const cantidad = parseInt(document.getElementById('stock-cantidad').value);
        const observacion = document.getElementById('stock-observacion').value;

        if (isNaN(cantidad)) {
            showToast('❌ Cantidad inválida', 'error');
            return;
        }

        // Example: await apiRequest(`/admin/productos/${productoID}/stock`, {
        //   method: 'PUT',
        //   body: JSON.stringify({ cantidad, observacion })
        // });

        const producto = productos.find(p => p.ProductoID == productoID);
        if (producto) {
            producto.StockActual = Math.max(0, producto.StockActual + cantidad);
        }

        await loadProductos();
        closeModal('modal-stock');
        showToast('✓ Stock actualizado exitosamente', 'success');
    } catch (err) {
        console.error('Error updating stock:', err);
        showToast('❌ Error al actualizar stock', 'error');
    }
}
