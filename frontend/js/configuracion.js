console.log('⚙️ configuracion-v3.js iniciando');

// ===== VARIABLES GLOBALES =====
let usuarioActual = null;
let esAdmin = false;

// ===== INICIALIZAR CONFIGURACIÓN =====
function inicializarConfiguracion() {
    console.log('⚙️ Inicializando configuración...');
    
    obtenerPerfilActual();
    cargarUsuarios();
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
        esAdmin = usuarioActual.rol === 'admin';
        
        console.log('👤 Perfil obtenido:', usuarioActual.usuario);
        console.log('👑 Es admin:', esAdmin);

        // Mostrar/ocultar secciones según rol
        actualizarVisibilidadPorRol();
        
    } catch (error) {
        console.error('❌ Error en obtenerPerfilActual:', error);
    }
}

// ===== ACTUALIZAR VISIBILIDAD POR ROL =====
function actualizarVisibilidadPorRol() {
    const seccionGestion = document.querySelector('.config-section:nth-child(2)');
    const seccionPassword = document.querySelector('.config-section:nth-child(3)');
    
    if (seccionGestion) {
        seccionGestion.style.display = esAdmin ? 'block' : 'none';
    }
    
    if (seccionPassword) {
        seccionPassword.style.display = 'block'; // Todos pueden cambiar su contraseña
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

    tbody.innerHTML = usuarios.map(usuario => `
        <tr>
            <td class="celda-nombre"><strong>${usuario.usuario}</strong></td>
            <td class="celda-detalle">
                <span class="badge ${usuario.rol === 'admin' ? 'badge-admin' : 'badge-operario'}">
                    ${usuario.rol === 'admin' ? '👑 Admin' : '👤 Operario'}
                </span>
            </td>
            <td class="celda-detalle">
                <span class="badge ${usuario.activo ? 'badge-success' : 'badge-danger'}">
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="celda-acciones">
                <button class="btn btn-sm" style="background: #dbeafe; color: #1e40af;" onclick="abrirModalEditarUsuario(${usuario.id}, '${usuario.usuario}', '${usuario.rol}', ${usuario.activo})" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn btn-sm" style="background: #fef3c7; color: #92400e;" onclick="abrirModalResetearPassword(${usuario.id}, '${usuario.usuario}')" title="Resetear contraseña">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                    </svg>
                </button>
                <button class="btn btn-sm" style="background: #fee2e2; color: #991b1b;" onclick="confirmarEliminarUsuario(${usuario.id}, '${usuario.usuario}')" title="Eliminar">
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
    document.getElementById('usuarioEditarRol').value = rol;
    document.getElementById('usuarioEditarActivo').checked = activo;

    modal.style.display = 'block';
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

    modal.style.display = 'block';
}

// ===== CONFIRMAR ELIMINAR USUARIO =====
function confirmarEliminarUsuario(id, usuario) {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${usuario}?`)) {
        eliminarUsuario(id);
    }
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
            alert('Error: ' + error.error);
            return;
        }

        alert('Usuario eliminado exitosamente');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error);
        alert('Error al eliminar usuario');
    }
}

// ===== GUARDAR USUARIO EDITADO =====
async function guardarUsuarioEditado() {
    const id = document.getElementById('usuarioEditarId').value;
    const usuario = document.getElementById('usuarioEditarNombre').value;
    const rol = document.getElementById('usuarioEditarRol').value;
    const activo = document.getElementById('usuarioEditarActivo').checked;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, rol, activo })
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Error: ' + error.error);
            return;
        }

        alert('Usuario actualizado exitosamente');
        cerrarModal('modalEditarUsuario');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        alert('Error al actualizar usuario');
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
            alert('Error: ' + error.error);
            return;
        }

        const data = await response.json();
        alert(`Nueva contraseña: ${data.nueva_password}\n\n⚠️ Comparte con el usuario de forma segura`);
        cerrarModal('modalResetearPassword');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error reseteando password:', error);
        alert('Error al resetear password');
    }
}

// ===== CAMBIAR MI CONTRASEÑA =====
async function cambiarMiContraseña(event) {
    event.preventDefault();
    
    const passwordActual = document.getElementById('passwordActual').value;
    const passwordNueva = document.getElementById('passwordNueva').value;
    const passwordConfirmar = document.getElementById('passwordConfirmar').value;

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
        alert('Completa todos los campos');
        return;
    }

    if (passwordNueva !== passwordConfirmar) {
        alert('Las contraseñas nuevas no coinciden');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/cambiar-password/actual`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ passwordActual, passwordNueva })
        });

        if (!response.ok) {
            const error = await response.json();
            alert('Error: ' + error.error);
            return;
        }

        alert('Contraseña actualizada exitosamente');
        document.getElementById('passwordActual').value = '';
        document.getElementById('passwordNueva').value = '';
        document.getElementById('passwordConfirmar').value = '';
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        alert('Error al cambiar contraseña');
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

    modal.style.display = 'block';
}

// ===== GUARDAR NUEVO USUARIO =====
async function guardarNuevoUsuario() {
    const usuario = document.getElementById('nuevoUsuarioNombre').value;
    const password = document.getElementById('nuevoUsuarioPassword').value;
    const rol = document.getElementById('nuevoUsuarioRol').value;

    if (!usuario || !password) {
        alert('Completa todos los campos');
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
            alert('Error: ' + error.error);
            return;
        }

        alert('Usuario creado exitosamente');
        cerrarModal('modalNuevoUsuario');
        cargarUsuarios();
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        alert('Error al crear usuario');
    }
}

// ===== CERRAR MODAL =====
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== CONFIGURAR EVENTOS =====
function configurarEventos() {
    // Cerrar modales al hacer clic fuera
    window.onclick = (event) => {
        const modales = ['modalNuevoUsuario', 'modalEditarUsuario', 'modalResetearPassword'];
        modales.forEach(id => {
            const modal = document.getElementById(id);
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
}

console.log('✅ configuracion-v3.js CARGADO');