// =======================================================
// AVILA'S TYRE COMPANY - PANEL ADMIN - PRODUCTOS
// =======================================================

// ===============================
// UTILIDADES
// ===============================
function showToast(msg, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 50);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Modal abrir/cerrar
function openModal(id) {
    document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}


// =======================================================
// CARGAR TABLA DE PRODUCTOS
// =======================================================
async function loadProductos() {
    try {
        const res = await fetch("/api/admin/productos");
        const data = await res.json();

        if (!res.ok) {
            showToast("❌ Error cargando productos", "error");
            return;
        }

        const tbody = document.querySelector("#productos-table tbody");
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">No hay productos registrados</td></tr>';
            return;
        }

        data.forEach(p => {
            const stockClass = p.StockActual === 0 ? 'badge-danger' : p.StockActual <= p.StockMinimo ? 'badge-warning' : 'badge-success';
            const stockLabel = p.StockActual === 0 ? '❌ Agotado' : p.StockActual <= p.StockMinimo ? '⚠️ Bajo' : '✅ Disponible';

            tbody.innerHTML += `
                <tr>
                    <td>${p.CodigoProducto}</td>
                    <td>${p.NombreProducto}</td>
                    <td>${p.NombreCategoria || 'N/A'}</td>
                    <td>${p.NombreMarca || 'N/A'}</td>
                    <td>${p.PrecioVentaBs.toFixed(2)}</td>
                    <td>${p.StockActual}</td>
                    <td><span class="badge ${stockClass}">${stockLabel}</span></td>
                    <td>
                        <button class="btn-icon" onclick="editarProducto(${p.ProductoID})" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="eliminarProducto(${p.ProductoID})" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error(err);
        showToast("❌ Error al conectar con el servidor", "error");
    }
}


// =======================================================
// CARGAR CATEGORÍAS Y MARCAS AL SELECT
// =======================================================
async function loadCategorias() {
    const select = document.getElementById("producto-categoria-id");
    select.innerHTML = `<option value="">Seleccione...</option>`;

    try {
        const res = await fetch("/api/admin/categorias");
        const data = await res.json();

        data.forEach(cat => {
            select.innerHTML += `<option value="${cat.CategoriaID}">${cat.NombreCategoria}</option>`;
        });
    } catch (err) {
        console.error("Error cargando categorías:", err);
    }
}

async function loadMarcas() {
    const select = document.getElementById("producto-marca-id");
    select.innerHTML = `<option value="">Seleccione...</option>`;

    try {
        const res = await fetch("/api/admin/marcas");
        const data = await res.json();

        data.forEach(m => {
            select.innerHTML += `<option value="${m.MarcaID}">${m.NombreMarca}</option>`;
        });
    } catch (err) {
        console.error("Error cargando marcas:", err);
    }
}


// =======================================================
// ABRIR MODAL PARA NUEVO PRODUCTO
// =======================================================
function nuevoProducto() {
    // Limpiar formulario
    document.getElementById('producto-id').value = '';
    document.getElementById('producto-codigo').value = '';
    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-descripcion').value = '';
    document.getElementById('producto-categoria-id').value = '';
    document.getElementById('producto-marca-id').value = '';
    document.getElementById('producto-precio-compra').value = '';
    document.getElementById('producto-precio-venta').value = '';
    document.getElementById('producto-stock-actual').value = '';
    document.getElementById('producto-stock-minimo').value = '';
    document.getElementById('producto-ancho').value = '';
    document.getElementById('producto-perfil').value = '';
    document.getElementById('producto-diametro-rin').value = '';
    document.getElementById('producto-indice-carga').value = '';
    document.getElementById('producto-indice-velocidad').value = '';
    document.getElementById('producto-destacado').checked = false;

    document.getElementById('modal-producto-title').textContent = 'Nuevo Producto';
    openModal('modal-producto');
}


// =======================================================
// LLENAR EL MODAL PARA EDITAR
// =======================================================
async function editarProducto(id) {
    try {
        const res = await fetch(`/api/admin/productos/${id}`);
        const p = await res.json();

        if (!res.ok) {
            showToast("❌ No se pudo cargar el producto", "error");
            return;
        }

        document.getElementById('producto-id').value = p.ProductoID;
        document.getElementById('producto-codigo').value = p.CodigoProducto;
        document.getElementById('producto-nombre').value = p.NombreProducto;
        document.getElementById('producto-descripcion').value = p.Descripcion || "";

        document.getElementById('producto-categoria-id').value = p.CategoriaID;
        document.getElementById('producto-marca-id').value = p.MarcaID;

        document.getElementById('producto-precio-compra').value = p.PrecioCompraBs;
        document.getElementById('producto-precio-venta').value = p.PrecioVentaBs;

        document.getElementById('producto-stock-actual').value = p.StockActual;
        document.getElementById('producto-stock-minimo').value = p.StockMinimo;

        // Datos llanta
        document.getElementById('producto-ancho').value = p.Ancho || "";
        document.getElementById('producto-perfil').value = p.Perfil || "";
        document.getElementById('producto-diametro-rin').value = p.DiametroRin || "";
        document.getElementById('producto-indice-carga').value = p.IndiceCarga || "";
        document.getElementById('producto-indice-velocidad').value = p.IndiceVelocidad || "";

        document.getElementById('producto-destacado').checked = p.Destacado === 1;

        document.getElementById('modal-producto-title').textContent = 'Editar Producto';
        openModal("modal-producto");

    } catch (err) {
        console.error(err);
        showToast("❌ Error al conectar con el servidor", "error");
    }
}



// =======================================================
// SAVE / UPDATE PRODUCTO
// =======================================================
async function saveProducto() {
    try {
        const productoID = document.getElementById('producto-id').value;

        const data = {
            ProductoID: productoID ? parseInt(productoID) : null,
            CodigoProducto: document.getElementById('producto-codigo').value.trim(),
            NombreProducto: document.getElementById('producto-nombre').value.trim(),
            Descripcion: document.getElementById('producto-descripcion').value.trim() || null,
            CategoriaID: parseInt(document.getElementById('producto-categoria-id').value) || null,
            MarcaID: parseInt(document.getElementById('producto-marca-id').value) || null,

            PrecioCompraBs: parseFloat(document.getElementById('producto-precio-compra').value),
            PrecioVentaBs: parseFloat(document.getElementById('producto-precio-venta').value),

            StockActual: parseInt(document.getElementById('producto-stock-actual').value),
            StockMinimo: parseInt(document.getElementById('producto-stock-minimo').value),

            // Datos llanta
            Ancho: parseInt(document.getElementById('producto-ancho').value) || null,
            Perfil: parseInt(document.getElementById('producto-perfil').value) || null,
            DiametroRin: parseInt(document.getElementById('producto-diametro-rin').value) || null,
            IndiceCarga: document.getElementById('producto-indice-carga').value || null,
            IndiceVelocidad: document.getElementById('producto-indice-velocidad').value || null,

            Destacado: document.getElementById('producto-destacado').checked ? 1 : 0,

            UsuarioID: 1
        };

        if (!data.CodigoProducto || !data.NombreProducto) {
            showToast('❌ Código y nombre son obligatorios', 'error');
            return;
        }

        const response = await fetch(`/api/admin/productos`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showToast("❌ Error: " + (result.error || "Error desconocido"), "error");
            return;
        }

        showToast("✔️ " + result.message, "success");

        closeModal('modal-producto');
        await loadProductos();

    } catch (err) {
        console.error("Error guardando producto:", err);
        showToast("❌ Error al conectar con el servidor", "error");
    }
}



// =======================================================
// ELIMINAR PRODUCTO
// =======================================================
async function eliminarProducto(id) {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    try {
        const res = await fetch(`/api/admin/productos/${id}`, { method: "DELETE" });
        const result = await res.json();

        if (!res.ok) {
            showToast("❌ No se pudo eliminar", "error");
            return;
        }

        showToast("✔️ Producto eliminado", "success");
        loadProductos();

    } catch (err) {
        console.error(err);
        showToast("❌ Error al conectar con el servidor", "error");
    }
}



// =======================================================
// INICIALIZACIÓN
// =======================================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadCategorias();
    await loadMarcas();
    await loadProductos();

    // Event listener para botón nuevo producto
    document.getElementById('btn-nuevo-producto')?.addEventListener('click', nuevoProducto);

    // Event listener para formulario
    document.getElementById('form-producto')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProducto();
    });
});
