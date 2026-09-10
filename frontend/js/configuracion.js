console.log('🔧 configuracion.js iniciando');

// Verificar que variables globales existan
if (typeof API_URL === 'undefined') {
    console.warn('⚠️ API_URL no está definida aún');
}
if (typeof token === 'undefined') {
    console.warn('⚠️ token no está definida aún');
}

// ===== CARGAR USUARIOS =====
async function cargarUsuarios() {
    try {
        console.log('👥 [cargarUsuarios] Iniciando...');
        console.log('   API_URL:', API_URL);
        console.log('   Token:', token ? '✅' : '❌');
        
        if (!API_URL || !token) {
            console.error('❌ Faltan API_URL o token');
            const tbody = document.getElementById('usuariosTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #ef4444;">Error: No autenticado</td></tr>';
            }
            return;
        }
        
        const url = `${API_URL}/usuarios`;
        console.log('📡 Fetch a:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Error:', response.status, response.statusText);
            const tbody = document.getElementById('usuariosTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #ef4444;">Error al cargar usuarios (${response.status})</td></tr>`;
            }
            return;
        }
        
        const usuarios = await response.json();
        console.log('✅ Usuarios obtenidos:', usuarios.length);
        
        renderizarTablaUsuarios(usuarios);
        
    } catch (error) {
        console.error('❌ Error en cargarUsuarios:', error);
        const tbody = document.getElementById('usuariosTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #ef4444;">Error: ${error.message}</td></tr>`;
        }
    }
}

// ===== RENDERIZAR TABLA USUARIOS =====
function renderizarTablaUsuarios(usuarios) {
    console.log('🎨 Renderizando tabla de usuarios');
    
    const tbody = document.getElementById('usuariosTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No hay usuarios registrados</td></tr>';
        return;
    }
    
    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        tr.id = `usuario-row-${usuario.id}`;
        tr.innerHTML = `
            <td class="celda-nombre">${usuario.usuario}</td>
            <td class="celda-detalle">
                <span class="badge badge-info">${usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}</span>
            </td>
            <td class="celda-detalle">
                <span class="badge ${usuario.activo ? 'badge-success' : 'badge-danger'}">
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="celda-acciones">
                <button class="btn btn-sm btn-secondary" type="button" onclick="editarUsuario(${usuario.id}); return false;" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </button>
                <button class="btn btn-sm btn-warning" type="button" onclick="resetearPassword(${usuario.id}); return false;" title="Resetear Contraseña">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                </button>
                <button class="btn btn-sm btn-danger" type="button" onclick="eliminarUsuarioConfirm(${usuario.id}); return false;" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('✅ Tabla renderizada');
}

// ===== ABRIR MODAL NUEVO USUARIO =====
function abrirModalNuevoUsuario() {
    console.log('📝 Abriendo modal nuevo usuario');
    
    const modal = document.getElementById('modalNuevoUsuario');
    if (!modal) return;
    
    document.getElementById('modalUsuarioTitulo').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioNuevo').value = '';
    document.getElementById('passwordNuevo').value = '';
    document.getElementById('rolNuevo').value = '';
    document.getElementById('formNuevoUsuario').reset();
    
    modal.classList.add('show');
}

// ===== CERRAR MODAL USUARIO =====
function cerrarModalUsuario() {
    const modal = document.getElementById('modalNuevoUsuario');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== GUARDAR NUEVO USUARIO =====
async function guardarNuevoUsuario(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuarioNuevo').value;
    const password = document.getElementById('passwordNuevo').value;
    const rol = document.getElementById('rolNuevo').value;
    
    if (!usuario || !password || !rol) {
        mostrarError('Completa todos los campos');
        return;
    }
    
    try {
        console.log('💾 Guardando nuevo usuario:', usuario);
        
        const response = await fetch(`${API_URL}/usuarios/crear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                usuario: usuario,
                password: password,
                rol: rol
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Usuario creado correctamente', 'success');
            cerrarModalUsuario();
            cargarUsuarios();
        } else {
            mostrarError(data.error || 'Error al crear usuario');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al crear usuario');
    }
}

// ===== EDITAR USUARIO =====
async function editarUsuario(usuarioId) {
    mostrarToast('Funcionalidad en desarrollo', 'info');
}

// ===== RESETEAR CONTRASEÑA =====
async function resetearPassword(usuarioId) {
    if (!confirm('¿Resetear la contraseña de este usuario?')) return;
    
    try {
        console.log('🔑 Reseteando contraseña de usuario:', usuarioId);
        
        const response = await fetch(`${API_URL}/usuarios/${usuarioId}/resetear-password`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast(`✅ Contraseña reseteada a: ${data.nuevaPassword}`, 'success');
            cargarUsuarios();
        } else {
            mostrarError(data.error || 'Error al resetear contraseña');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al resetear contraseña');
    }
}

// ===== ELIMINAR USUARIO =====
function eliminarUsuarioConfirm(usuarioId) {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
        eliminarUsuario(usuarioId);
    }
}

async function eliminarUsuario(usuarioId) {
    try {
        console.log('🗑️ Eliminando usuario:', usuarioId);
        
        const response = await fetch(`${API_URL}/usuarios/${usuarioId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            mostrarToast('✅ Usuario eliminado correctamente', 'success');
            cargarUsuarios();
        } else {
            mostrarError('Error al eliminar usuario');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al eliminar usuario');
    }
}

// ===== CAMBIAR MI CONTRASEÑA =====
async function cambiarMiContraseña(e) {
    e.preventDefault();
    
    const passwordActual = document.getElementById('passwordActual').value;
    const passwordNueva = document.getElementById('passwordNueva').value;
    const passwordConfirmar = document.getElementById('passwordConfirmar').value;
    
    if (passwordNueva !== passwordConfirmar) {
        mostrarError('Las contraseñas no coinciden');
        return;
    }
    
    if (passwordNueva.length < 4) {
        mostrarError('La contraseña debe tener al menos 4 caracteres');
        return;
    }
    
    try {
        console.log('🔐 Cambiando contraseña');
        
        const response = await fetch(`${API_URL}/auth/cambiar-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                passwordActual: passwordActual,
                passwordNueva: passwordNueva
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('✅ Contraseña cambiada correctamente', 'success');
            document.getElementById('formCambiarPassword').reset();
        } else {
            mostrarError(data.error || 'Error al cambiar contraseña');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cambiar contraseña');
    }
}

// ===== INICIALIZAR CUANDO SE CARGA LA PESTAÑA =====
function inicializarConfiguracion() {
    console.log('⚙️ Inicializando configuración');
    cargarUsuarios();
}

console.log('✅ configuracion.js CARGADO');