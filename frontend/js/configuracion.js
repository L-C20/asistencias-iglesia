console.log('🔧 configuracion-v2.js iniciando');

// ===== CARGAR USUARIOS =====
async function cargarUsuarios() {
    try {
        console.log('═══════════════════════════════════════');
        console.log('👥 [cargarUsuarios] Iniciando...');
        console.log('═══════════════════════════════════════');
        
        // Verificar variables globales
        if (typeof API_URL === 'undefined') {
            console.error('❌ API_URL no definida');
            mostrarErrorEnTabla('API_URL no definida');
            return;
        }
        
        if (typeof token === 'undefined') {
            console.error('❌ token no definido');
            mostrarErrorEnTabla('Token no definido');
            return;
        }
        
        console.log('✅ API_URL:', API_URL);
        console.log('✅ Token disponible');
        
        const url = `${API_URL}/usuarios`;
        console.log('📡 Haciendo fetch a:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📊 Response status:', response.status);
        console.log('📊 Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error HTTP:', response.status, errorText);
            mostrarErrorEnTabla(`Error ${response.status}: ${errorText}`);
            return;
        }
        
        const usuarios = await response.json();
        console.log('✅ Usuarios obtenidos:', usuarios);
        console.log('   Cantidad:', usuarios.length);
        
        if (!Array.isArray(usuarios)) {
            console.error('❌ Usuarios no es un array:', typeof usuarios);
            mostrarErrorEnTabla('Respuesta inválida del servidor');
            return;
        }
        
        renderizarTablaUsuarios(usuarios);
        
    } catch (error) {
        console.error('❌ Error crítico:', error);
        console.error('   Nombre:', error.name);
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        mostrarErrorEnTabla(`Error: ${error.message}`);
    }
}

// ===== MOSTRAR ERROR EN TABLA =====
function mostrarErrorEnTabla(mensaje) {
    const tbody = document.getElementById('usuariosTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #ef4444;">⚠️ ${mensaje}</td></tr>`;
    }
}

// ===== RENDERIZAR TABLA USUARIOS =====
function renderizarTablaUsuarios(usuarios) {
    console.log('🎨 [renderizarTablaUsuarios] Renderizando:', usuarios.length, 'usuarios');
    
    const tbody = document.getElementById('usuariosTableBody');
    if (!tbody) {
        console.error('❌ usuariosTableBody no encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!usuarios || usuarios.length === 0) {
        console.log('ℹ️ No hay usuarios');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-light);">No hay usuarios registrados</td></tr>';
        return;
    }
    
    usuarios.forEach((usuario, idx) => {
        console.log(`  ${idx + 1}. ${usuario.usuario} (${usuario.rol})`);
        
        const tr = document.createElement('tr');
        tr.id = `usuario-row-${usuario.id}`;
        tr.innerHTML = `
            <td class="celda-nombre" style="padding: 12px; border-bottom: 1px solid var(--border);">${usuario.usuario || 'N/A'}</td>
            <td class="celda-detalle" style="padding: 12px; border-bottom: 1px solid var(--border);">
                <span class="badge" style="background: #e3f2fd; color: #1565c0; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                    ${usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
            </td>
            <td class="celda-detalle" style="padding: 12px; border-bottom: 1px solid var(--border);">
                <span class="badge" style="background: ${usuario.activo ? '#d1fae5' : '#fee2e2'}; color: ${usuario.activo ? '#065f46' : '#991b1b'}; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="celda-acciones" style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; gap: 6px;">
                <button class="btn btn-sm btn-secondary" type="button" onclick="editarUsuario(${usuario.id}); return false;" title="Editar" style="padding: 6px 10px; font-size: 11px;">
                    ✏️
                </button>
                <button class="btn btn-sm btn-warning" type="button" onclick="resetearPassword(${usuario.id}); return false;" title="Resetear Contraseña" style="padding: 6px 10px; font-size: 11px;">
                    🔑
                </button>
                <button class="btn btn-sm btn-danger" type="button" onclick="eliminarUsuarioConfirm(${usuario.id}); return false;" title="Eliminar" style="padding: 6px 10px; font-size: 11px;">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log('✅ Tabla renderizada correctamente');
}

// ===== ABRIR MODAL NUEVO USUARIO =====
function abrirModalNuevoUsuario() {
    console.log('📝 Abriendo modal nuevo usuario');
    
    const modal = document.getElementById('modalNuevoUsuario');
    if (!modal) {
        console.error('❌ Modal no encontrado');
        mostrarError('Modal no encontrado');
        return;
    }
    
    document.getElementById('modalUsuarioTitulo').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioNuevo').value = '';
    document.getElementById('passwordNuevo').value = '';
    document.getElementById('rolNuevo').value = '';
    document.getElementById('formNuevoUsuario').reset();
    
    modal.classList.add('show');
    console.log('✅ Modal abierto');
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
    
    console.log('💾 Guardando nuevo usuario:', usuario);
    
    if (!usuario || !password || !rol) {
        mostrarError('Completa todos los campos');
        return;
    }
    
    try {
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
            mostrarToast(`✅ Nueva contraseña: ${data.nuevaPassword}`, 'success');
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

console.log('✅ configuracion-v2.js CARGADO COMPLETAMENTE');