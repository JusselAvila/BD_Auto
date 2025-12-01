document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const formPerfilUsuario = document.getElementById('form-perfil-usuario');
    const formPerfilDireccion = document.getElementById('form-perfil-direccion');

    const inputNombre = document.getElementById('perfil-nombre');
    const inputEmail = document.getElementById('perfil-email');
    const inputTelefono = document.getElementById('perfil-telefono');

    // Elementos del formulario de dirección
    const seccionDireccionExistente = document.getElementById('direccion-existente');
    const seccionNuevaDireccion = document.getElementById('formulario-nueva-direccion');

    const textoDireccion = document.getElementById('direccion-texto');

    const inputDireccionID = document.getElementById('direccion-id');
    const inputNombreDireccion = document.getElementById('nombre-direccion');
    const selectDepartamento = document.getElementById('perfil-departamento');
    const selectCiudad = document.getElementById('perfil-ciudad');
    const inputCalle = document.getElementById('direccion-calle');
    const inputZona = document.getElementById('direccion-zona');
    const inputReferencia = document.getElementById('direccion-referencia');
    const inputEsPrincipal = document.getElementById('direccion-es-principal');

    const btnCambiarDireccion = document.getElementById('btn-cambiar-direccion');
    const btnCancelarDireccion = document.getElementById('btn-cancelar-direccion');

    let datosUsuarioCache = null;

    // --- LÓGICA DE API ---

    // Función para obtener el token de autenticación
    function getToken() {
        return localStorage.getItem('authToken');
    }

    // Función para realizar llamadas fetch autenticadas
    async function fetchAPI(url, options = {}) {
        const token = getToken();
        if (!token) {
            alert('No estás autenticado. Redirigiendo a login.');
            window.location.href = 'login.html';
            return;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
            localStorage.removeItem('authToken'); // Asegurarse de limpiar la clave correcta
            window.location.href = 'login.html';
            throw new Error('No autorizado');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ocurrió un error en la solicitud.');
        }

        return response.json();
    }


    async function cargarDatosUsuario() {
        try {
            const data = await fetchAPI('/api/perfil');
            datosUsuarioCache = data;

            // Cargar datos personales
            inputNombre.value = data.nombre;
            inputEmail.value = data.email;
            inputTelefono.value = data.telefono || '';

            // Cargar departamentos (siempre se cargan para el dropdown)
            await cargarDepartamentos();

            // Cargar y mostrar dirección
            if (data.direccion && data.direccion.DireccionID) {
                mostrarDireccionExistente(data.direccion);
            } else {
                mostrarFormularioNuevaDireccion(true); // Pasar true para indicar que no hay dirección precargada
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
            alert(error.message);
        }
    }

    function mostrarDireccionExistente(direccion) {
        textoDireccion.textContent = 
            `${direccion.NombreDireccion ? direccion.NombreDireccion + ' - ' : ''}` +
            `${direccion.Calle}, ` +
            `${direccion.Zona ? direccion.Zona + ', ' : ''}` +
            `${direccion.NombreCiudad} (${direccion.NombreDepartamento}). ` +
            `Ref: ${direccion.Referencia || 'ninguna'}`;
        seccionDireccionExistente.style.display = 'block';
        seccionNuevaDireccion.style.display = 'none';
    }

    async function mostrarFormularioNuevaDireccion(esNueva = false) {
        seccionDireccionExistente.style.display = 'none';
        seccionNuevaDireccion.style.display = 'block';

        // Limpiar formulario al mostrarlo (especialmente si es una nueva dirección)
        inputDireccionID.value = '';
        inputNombreDireccion.value = '';
        selectDepartamento.value = '';
        selectCiudad.innerHTML = '<option value="">Seleccione un departamento primero</option>';
        selectCiudad.disabled = true;
        inputCalle.value = '';
        inputZona.value = '';
        inputReferencia.value = '';
        inputEsPrincipal.checked = false;

        if (!esNueva && datosUsuarioCache && datosUsuarioCache.direccion && datosUsuarioCache.direccion.DireccionID) {
            // Precargar datos de la dirección existente para edición
            const dir = datosUsuarioCache.direccion;
            inputDireccionID.value = dir.DireccionID;
            inputNombreDireccion.value = dir.NombreDireccion || '';
            selectDepartamento.value = dir.DepartamentoID; // Selecciona el departamento
            
            // Cargar ciudades del departamento seleccionado y luego seleccionar la ciudad
            if (dir.DepartamentoID) {
                await cargarCiudades(dir.DepartamentoID);
                selectCiudad.value = dir.CiudadID; // Selecciona la ciudad
                selectCiudad.disabled = false;
            }
            
            inputCalle.value = dir.Calle || '';
            inputZona.value = dir.Zona || '';
            inputReferencia.value = dir.Referencia || '';
            inputEsPrincipal.checked = dir.EsPrincipal;
        } else {
            // Si es nueva dirección o no hay cache, nos aseguramos de que el departamento esté en blanco
            selectDepartamento.value = '';
        }
    }

    // --- FUNCIONES PARA CARGAR GEOGRAFÍA ---
    async function cargarDepartamentos() {
        try {
            const response = await fetch('/api/departamentos');
            const departamentos = await response.json();

            selectDepartamento.innerHTML = '<option value="">Seleccione un departamento</option>';
            departamentos.forEach(dep => {
                const option = document.createElement('option');
                option.value = dep.DepartamentoID;
                option.textContent = dep.NombreDepartamento;
                selectDepartamento.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando departamentos:', error);
            alert('Error al cargar la lista de departamentos.');
        }
    }

    async function cargarCiudades(departamentoID) {
        try {
            const response = await fetch(`/api/ciudades/${departamentoID}`);
            const ciudades = await response.json();

            selectCiudad.innerHTML = '<option value="">Seleccione una ciudad</option>';
            ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.CiudadID;
                option.textContent = ciudad.NombreCiudad;
                selectCiudad.appendChild(option);
            });
            selectCiudad.disabled = false;
        } catch (error) {
            console.error('Error cargando ciudades:', error);
            alert('Error al cargar la lista de ciudades.');
            selectCiudad.disabled = true;
        }
    }

    // --- EVENT LISTENERS ---

    btnCambiarDireccion.addEventListener('click', () => mostrarFormularioNuevaDireccion(false)); // False para indicar edición

    btnCancelarDireccion.addEventListener('click', () => {
        if (datosUsuarioCache && datosUsuarioCache.direccion && datosUsuarioCache.direccion.DireccionID) {
            mostrarDireccionExistente(datosUsuarioCache.direccion);
        } else {
            // Si no había dirección, simplemente ocultamos el form de nueva dirección
            seccionNuevaDireccion.style.display = 'none';
        }
    });

    selectDepartamento.addEventListener('change', async (e) => {
        const depID = e.target.value;
        selectCiudad.innerHTML = '<option value="">Seleccione un departamento primero</option>';
        selectCiudad.disabled = true;
        if (depID) {
            await cargarCiudades(depID);
        }
    });

    formPerfilUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const nombreActualizado = inputNombre.value;
            const telefonoActualizado = inputTelefono.value;
            const response = await fetchAPI('/api/perfil/usuario', {
                method: 'PUT',
                body: JSON.stringify({ 
                    nombre: nombreActualizado,
                    telefono: telefonoActualizado
                })
            });
            alert(response.message);
            // Actualizar caché local
            datosUsuarioCache.nombre = nombreActualizado;
            datosUsuarioCache.telefono = telefonoActualizado;

            // Si el nombre del usuario está en el header, puede que necesitemos actualizarlo
            // Esto es si 'actualizarHeaderUI()' no se llama automáticamente en el index.
            // if (window.actualizarHeaderUI) window.actualizarHeaderUI();

        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            alert(error.message);
        }
    });

    formPerfilDireccion.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const direccionID = inputDireccionID.value || null;
        const nombreDireccion = inputNombreDireccion.value;
        const departamentoID = selectDepartamento.value;
        const ciudadID = selectCiudad.value;
        const calle = inputCalle.value;
        const zona = inputZona.value;
        const referencia = inputReferencia.value;
        const esPrincipal = inputEsPrincipal.checked;

        // Validaciones básicas
        if (!nombreDireccion || !departamentoID || !ciudadID || !calle) {
            alert('Por favor, complete todos los campos obligatorios de la dirección.');
            return;
        }

        try {
            const response = await fetchAPI('/api/perfil/direccion', {
                method: 'PUT',
                body: JSON.stringify({
                    DireccionID: direccionID, // Se envía para actualizar o crear
                    NombreDireccion: nombreDireccion,
                    Calle: calle,
                    Zona: zona,
                    CiudadID: parseInt(ciudadID),
                    Referencia: referencia,
                    EsPrincipal: esPrincipal
                })
            });

            alert(response.message);

            // Tras guardar, recargar los datos del usuario para reflejar los cambios
            // y volver a mostrar la dirección existente actualizada
            await cargarDatosUsuario();

        } catch (error) {
            console.error('Error al guardar la dirección:', error);
            alert(error.message);
        }
    });

    // --- INICIALIZACIÓN ---
    cargarDatosUsuario();
});