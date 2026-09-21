// ===== VARIABLES GLOBALES =====
let usuarioActual = null;
let esAdmin = false;
let esSuperadmin = false;
let iglesiasCargadas = [];

// ===== INICIALIZAR CONFIGURACIÓN =====
// El perfil define si es admin, y de eso depende si se pueden listar usuarios.
async function inicializarConfiguracion() {
    console.log('⚙️ Inicializando configuración...');

    await obtenerPerfilActual();
    await Promise.all([cargarUsuarios(), cargarIglesias()]);
    configurarEventos();
}

// ===== OBTENER PERFIL ACTUAL =====
async function obtenerPerfilActual() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/perfil/actual`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('❌ Error obteniendo perfil');
            return;
        }

        usuarioActual = await response.json();
        esSuperadmin = usuarioActual.rol === 'superadmin';
        esAdmin = esSuperadmin || usuarioActual.rol === 'admin';

        console.log('👤 Perfil obtenido:', usuarioActual.usuario, '- rol:', usuarioActual.rol);

        // Mostrar/ocultar secciones según rol
        actualizarVisibilidadPorRol();
        
    } catch (error) {
        console.error('❌ Error en obtenerPerfilActual:', error);
    }
}

// ===== ACTUALIZAR VISIBILIDAD POR ROL =====
function actualizarVisibilidadPorRol() {
    const seccionGestion = document.getElementById('seccionGestionUsuarios');
    if (seccionGestion) {
        seccionGestion.style.display = esAdmin ? 'block' : 'none';
    }

    const seccionIglesias = document.getElementById('seccionIglesias');
    if (seccionIglesias) seccionIglesias.hidden = !esSuperadmin;

    // El super administrador ve los usuarios de la iglesia que tiene elegida
    const tituloUsuarios = document.getElementById('tituloUsuarios');
    if (tituloUsuarios) {
        tituloUsuarios.textContent = esSuperadmin && APP_CONFIG.nombre
            ? `Gestión de Usuarios · ${APP_CONFIG.nombre}`
            : 'Gestión de Usuarios';
    }

    // Mostrar mensaje si no es admin
    if (!esAdmin) {
        const contenedor = document.querySelector('.config-container');
        const aviso = document.createElement('div');
        aviso.className = 'aviso-operario';
        aviso.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Solo los administradores pueden gestionar usuarios</span>
        `;
        if (contenedor && !contenedor.querySelector('.aviso-operario')) {
            contenedor.insertBefore(aviso, contenedor.firstChild);
        }
    }
}

// ===== CARGAR USUARIOS =====
async function cargarUsuarios() {
    if (!esAdmin) {
        console.log('⚠️ Solo admins pueden ver usuarios');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('❌ Error cargando usuarios');
            return;
        }

        const usuarios = await response.json();
        console.log('📋 Usuarios cargados:', usuarios.length);

        renderizarTablaUsuarios(usuarios);
        
    } catch (error) {
        console.error('❌ Error en cargarUsuarios:', error);
    }
}

// ===== RENDERIZAR TABLA USUARIOS =====
function renderizarTablaUsuarios(usuarios) {
    const tbody = document.querySelector('#usuariosTableBody');
    if (!tbody) {
        console.error('❌ Tabla de usuarios no encontrada');
        return;
    }

    const ETIQUETA_ROL = { superadmin: 'Super admin', admin: 'Admin', operario: 'Monitor' };

    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td class="celda-nombre">${escaparHtml(usuario.usuario)}</td>
            <td class="celda-detalle">
                <span class="badge badge-${usuario.rol}">
                    ${ETIQUETA_ROL[usuario.rol] || usuario.rol}
                </span>
            </td>
            <td class="celda-detalle">
                <span class="badge ${usuario.activo ? 'badge-success' : 'badge-danger'}">
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="celda-acciones">
                <button class="btn btn-sm" onclick="abrirModalEditarUsuario(${usuario.id}, this.dataset.usuario, '${usuario.rol}', ${usuario.activo})" data-usuario="${escaparHtml(usuario.usuario)}" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn btn-sm" onclick="abrirModalResetearPassword(${usuario.id}, this.dataset.usuario)" data-usuario="${escaparHtml(usuario.usuario)}" title="Resetear contraseña">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                    </svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmarEliminarUsuario(${usuario.id}, this.dataset.usuario)" data-usuario="${escaparHtml(usuario.usuario)}" title="Eliminar" ${usuario.id === usuarioActual?.id ? 'disabled' : ''}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    console.log('✅ Tabla renderizada');
}

// ===== ABRIR MODAL EDITAR USUARIO =====
function abrirModalEditarUsuario(id, usuario, rol, activo) {
    const modal = document.getElementById('modalEditarUsuario');
    if (!modal) {
        console.error('❌ Modal editar usuario no encontrado');
        return;
    }

    document.getElementById('usuarioEditarId').value = id;
    document.getElementById('usuarioEditarNombre').value = usuario;
    document.getElementById('usuarioEditarPassword').value = '';

    // Nadie se cambia el rol ni se desactiva a sí mismo
    const esYo = usuarioActual && id === usuarioActual.id;
    const selectRol = document.getElementById('usuarioEditarRol');
    selectRol.value = rol;
    selectRol.disabled = esYo;
    const activoInput = document.getElementById('usuarioEditarActivo');
    activoInput.checked = activo;
    activoInput.disabled = esYo;

    modal.classList.add('show');
}

// ===== ABRIR MODAL RESETEAR PASSWORD =====
function abrirModalResetearPassword(id, usuario) {
    const modal = document.getElementById('modalResetearPassword');
    if (!modal) {
        console.error('❌ Modal resetear password no encontrado');
        return;
    }

    document.getElementById('usuarioResetId').value = id;
    document.getElementById('usuarioResetNombre').innerHTML = usuario;

    modal.classList.add('show');
}

// ===== CONFIRMAR ELIMINAR USUARIO =====
async function confirmarEliminarUsuario(id, usuario) {
    const ok = await confirmar({
        titulo: 'Eliminar usuario',
        mensaje: `¿Eliminar a ${usuario}?\n\nYa no va a poder entrar a la aplicación. Esta acción no se puede deshacer.`,
        confirmar: 'Eliminar',
        peligroso: true
    });
    if (ok) eliminarUsuario(id);
}

// ===== ELIMINAR USUARIO =====
async function eliminarUsuario(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.json();
            mostrarToast(error.error || 'Ocurrió un error', 'error');
            return;
        }

        mostrarToast('Usuario eliminado', 'success');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        mostrarToast('No se pudo eliminar el usuario', 'error');
    }
}

// ===== GUARDAR USUARIO EDITADO =====
async function guardarUsuarioEditado() {
    const id = document.getElementById('usuarioEditarId').value;
    const usuario = document.getElementById('usuarioEditarNombre').value;
    const rol = document.getElementById('usuarioEditarRol').value;
    const activo = document.getElementById('usuarioEditarActivo').checked;
    const password = document.getElementById('usuarioEditarPassword').value;

    if (password && password.length < 6) {
        mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const cabeceras = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Sobre uno mismo solo se manda el nombre (rol y estado van deshabilitados)
        const esYo = usuarioActual && Number(id) === usuarioActual.id;
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: cabeceras,
            body: JSON.stringify(esYo ? { usuario } : { usuario, rol, activo })
        });

        if (!response.ok) {
            const error = await response.json();
            mostrarToast(error.error || 'Ocurrió un error', 'error');
            return;
        }

        if (password) {
            const rp = await fetch(`${API_URL}/usuarios/${id}/password`, {
                method: 'PUT',
                headers: cabeceras,
                body: JSON.stringify({ password })
            });
            if (!rp.ok) {
                const error = await rp.json();
                mostrarToast('Datos guardados, pero la contraseña no: ' + (error.error || 'error'), 'error');
                cargarUsuarios();
                return;
            }
        }

        mostrarToast(password ? 'Usuario y contraseña actualizados' : 'Usuario actualizado', 'success');
        cerrarModal('modalEditarUsuario');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        mostrarToast('No se pudo actualizar el usuario', 'error');
    }
}

// ===== RESETEAR PASSWORD =====
async function resetearPassword() {
    const id = document.getElementById('usuarioResetId').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/${id}/resetear-password`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const error = await response.json();
            mostrarToast(error.error || 'Ocurrió un error', 'error');
            return;
        }

        const data = await response.json();
        cerrarModal('modalResetearPassword');
        cargarUsuarios();
        const clave = document.createElement('code');
        clave.className = 'clave-generada';
        clave.textContent = data.nueva_password;
        await confirmar({
            titulo: 'Contraseña restablecida',
            mensaje: 'Compartila con el usuario de forma segura. No se vuelve a mostrar.',
            detalle: clave.outerHTML,
            confirmar: 'Listo',
            cancelar: null
        });
    } catch (error) {
        console.error('❌ Error reseteando password:', error);
        mostrarToast('No se pudo restablecer la contraseña', 'error');
    }
}

// ===== ABRIR MODAL NUEVO USUARIO =====
function abrirModalNuevoUsuario() {
    const modal = document.getElementById('modalNuevoUsuario');
    if (!modal) {
        console.error('❌ Modal nuevo usuario no encontrado');
        return;
    }

    document.getElementById('nuevoUsuarioNombre').value = '';
    document.getElementById('nuevoUsuarioPassword').value = '';
    document.getElementById('nuevoUsuarioRol').value = 'operario';

    modal.classList.add('show');
}

// ===== GUARDAR NUEVO USUARIO =====
async function guardarNuevoUsuario() {
    const usuario = document.getElementById('nuevoUsuarioNombre').value;
    const password = document.getElementById('nuevoUsuarioPassword').value;
    const rol = document.getElementById('nuevoUsuarioRol').value;

    if (!usuario || !password) {
        mostrarToast('Completá todos los campos', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/crear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, password, rol })
        });

        if (!response.ok) {
            const error = await response.json();
            mostrarToast(error.error || 'Ocurrió un error', 'error');
            return;
        }

        mostrarToast('Usuario creado', 'success');
        cerrarModal('modalNuevoUsuario');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        mostrarToast('No se pudo crear el usuario', 'error');
    }
}

// ===== IGLESIAS (solo super administrador) =====
async function cargarIglesias() {
    if (!esSuperadmin) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/iglesias`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            console.error('❌ Error cargando iglesias');
            return;
        }
        iglesiasCargadas = await response.json();
        renderizarTablaIglesias(iglesiasCargadas);
    } catch (error) {
        console.error('❌ Error en cargarIglesias:', error);
    }
}

function renderizarTablaIglesias(iglesias) {
    const tbody = document.getElementById('iglesiasTableBody');
    if (!tbody) return;

    if (iglesias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="tabla-vacia">No hay iglesias cargadas</td></tr>';
        return;
    }

    tbody.innerHTML = iglesias.map(i => `
        <tr class="${i.activa ? '' : 'fila-inactiva'}">
            <td class="celda-nombre">
                ${escaparHtml(i.nombre)}
                ${i.id === APP_CONFIG.id ? '<span class="badge badge-admin">actual</span>' : ''}
                ${i.activa ? '' : '<span class="badge badge-danger">baja</span>'}
            </td>
            <td class="celda-detalle">${escaparHtml(i.departamento) || '—'}</td>
            <td class="celda-detalle">${escaparHtml(i.anciano) || '—'}</td>
            <td class="celda-detalle">${i.grupos.map(g => `<span class="badge badge-grupo">${g.nombre}</span>`).join('')}</td>
            <td class="celda-detalle">${i.integrantes}</td>
            <td class="celda-detalle">${i.usuarios}</td>
            <td class="celda-acciones">
                <button class="btn btn-sm" onclick="abrirModalIglesia(${i.id})" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                ${i.id === APP_CONFIG.id ? '' : `
                <button class="btn btn-sm btn-secondary" onclick="cambiarIglesia(${i.id})" title="Trabajar sobre esta iglesia">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>`}
            </td>
        </tr>
    `).join('');
}

// Sin id: crear (pide el primer administrador). Con id: editar datos.
function abrirModalIglesia(id) {
    const modal = document.getElementById('modalIglesia');
    if (!modal) return;

    const iglesia = id ? iglesiasCargadas.find(i => i.id === id) : null;
    const editando = !!iglesia;

    document.getElementById('modalIglesiaTitulo').textContent = editando ? 'Editar Iglesia' : 'Nueva Iglesia';
    document.getElementById('btnGuardarIglesia').textContent = editando ? 'Guardar cambios' : 'Crear iglesia';
    document.getElementById('iglesiaId').value = editando ? iglesia.id : '';
    document.getElementById('iglesiaNombre').value = editando ? iglesia.nombre : '';
    document.getElementById('iglesiaDepartamento').value = editando ? iglesia.departamento : '';
    document.getElementById('iglesiaAnciano').value = editando ? iglesia.anciano : '';

    const tiene = g => editando ? iglesia.grupos.some(x => x.id === g) : g === 'orquesta';
    document.getElementById('iglesiaGrupoOrquesta').checked = tiene('orquesta');
    document.getElementById('iglesiaGrupoCoro').checked = tiene('coro');

    document.getElementById('bloqueAdminIglesia').hidden = editando;
    document.getElementById('iglesiaAdminUsuario').value = '';
    document.getElementById('iglesiaAdminPassword').value = '';
    document.getElementById('bloqueActivaIglesia').hidden = !editando;
    document.getElementById('iglesiaActiva').checked = editando ? iglesia.activa : true;

    modal.classList.add('show');
    document.getElementById('iglesiaNombre').focus();
}

async function guardarIglesia(e) {
    e.preventDefault();

    const id = document.getElementById('iglesiaId').value;
    const grupos = ['iglesiaGrupoOrquesta', 'iglesiaGrupoCoro']
        .map(i => document.getElementById(i))
        .filter(c => c.checked)
        .map(c => c.value);

    const datos = {
        nombre: document.getElementById('iglesiaNombre').value.trim(),
        departamento: document.getElementById('iglesiaDepartamento').value.trim(),
        anciano: document.getElementById('iglesiaAnciano').value.trim(),
        grupos
    };

    if (!datos.nombre) { mostrarToast('Poné el nombre de la iglesia', 'error'); return; }
    if (grupos.length === 0) { mostrarToast('Elegí al menos un grupo: orquesta o coro', 'error'); return; }

    if (id) {
        datos.activa = document.getElementById('iglesiaActiva').checked;
    } else {
        datos.admin_usuario = document.getElementById('iglesiaAdminUsuario').value.trim();
        datos.admin_password = document.getElementById('iglesiaAdminPassword').value;
        if (!datos.admin_usuario) { mostrarToast('Indicá el usuario administrador de la iglesia', 'error'); return; }
        if (datos.admin_password.length < 6) { mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
    }

    const boton = document.getElementById('btnGuardarIglesia');
    boton.disabled = true;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/iglesias${id ? '/' + id : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            mostrarToast(data.error || 'Ocurrió un error', 'error');
            return;
        }

        cerrarModal('modalIglesia');
        mostrarToast(id ? 'Iglesia actualizada' : `Iglesia ${datos.nombre} creada`, 'success');
        await cargarIglesias();

        // Si se editó la iglesia actual, su nombre y grupos pueden haber cambiado
        if (id && Number(id) === APP_CONFIG.id) {
            await cargarConfigApp();
            cargarConteosMiembros();
        } else if (!id) {
            // La lista del selector de la barra también cambia
            cargarConfigApp();
        }
    } catch (error) {
        console.error('❌ Error guardando iglesia:', error);
        mostrarToast('No se pudo guardar la iglesia', 'error');
    } finally {
        boton.disabled = false;
    }
}

// ===== CERRAR MODAL =====
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== CONFIGURAR EVENTOS =====
function configurarEventos() {
    // Cerrar modales al hacer clic fuera
    window.onclick = (event) => {
        const modales = ['modalNuevoUsuario', 'modalEditarUsuario', 'modalResetearPassword', 'modalIglesia'];
        modales.forEach(id => {
            const modal = document.getElementById(id);
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    };
}

console.log('✅ configuracion.js CARGADO');