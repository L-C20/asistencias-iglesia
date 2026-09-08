const API_URL = '/api';
let token = null;
let usuarioActual = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en login
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', login);
    }
    
    // Si estamos en dashboard
    if (document.querySelector('.sidebar')) {
        // Verificar token
        verificarToken();
        
        // Tabs
        const tabButtons = document.querySelectorAll('.sidebar-menu-item');
        if (tabButtons.length > 0) {
            tabButtons.forEach((btn, index) => {
                btn.addEventListener('click', () => {
                    const tabs = ['coro', 'orquesta', 'reportes'];
                    if (tabs[index]) cambiarTab(tabs[index]);
                });
            });
        }
        
        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        // Modal
        const formNuevo = document.getElementById('formNuevoMiembro');
        if (formNuevo) {
            formNuevo.addEventListener('submit', guardarNuevoMiembro);
        }
        
        // Cargar fecha actual (con verificación)
        const fechaCoro = document.getElementById('fechaCoro');
        const fechaOrquesta = document.getElementById('fechaOrquesta');
        
        if (fechaCoro) fechaCoro.valueAsDate = new Date();
        if (fechaOrquesta) fechaOrquesta.valueAsDate = new Date();
        
        // Cargar miembros de coro automáticamente
        setTimeout(() => {
            cargarMiembros('coro');
        }, 500);
    }
});

// ===== LOGIN =====
async function login(e) {
    e.preventDefault();
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            errorDiv.textContent = data.error || 'Error en el login';
            errorDiv.classList.add('show');
            return;
        }
        
        token = data.token;
        usuarioActual = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuarioActual));
        
        window.location.href = '/dashboard';
        
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'Error de conexión';
        errorDiv.classList.add('show');
    }
}

// ===== VERIFICAR TOKEN =====
async function verificarToken() {
    token = localStorage.getItem('token');
    usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/';
        } else {
            mostrarUsuario();
        }
    } catch (error) {
        console.error('Error verificando token:', error);
        window.location.href = '/';
    }
}

// ===== MOSTRAR USUARIO ACTUAL =====
function mostrarUsuario() {
    const userSpan = document.getElementById('usuarioActual');
    if (userSpan && usuarioActual) {
        userSpan.textContent = usuarioActual.usuario;
    }
}

// ===== LOGOUT =====
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
}

// ===== CAMBIAR TAB =====
function cambiarTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    if (tabName === 'inicio') menuItems[0].classList.add('active');
    else if (tabName === 'asistencia') menuItems[1].classList.add('active');
    else if (tabName === 'reportes') menuItems[2].classList.add('active');
}

// ===== SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
}

function cerrarSidebarMobil() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('collapsed');
        document.getElementById('mainContent').classList.add('sidebar-collapsed');
    }
}

// Cerrar sidebar al hacer click fuera
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    
    if (sidebar && toggle && window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !toggle.contains(e.target) &&
        !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        document.getElementById('mainContent').classList.add('sidebar-collapsed');
    }
});

// ===== NOTIFICACIONES TOAST =====
function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span class="toast-icon"></span>
        <span>${mensaje}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remover después de 3 segundos
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

function mostrarMensajeExito(mensaje) {
    mostrarToast(mensaje, 'success');
}

function mostrarError(mensaje) {
    mostrarToast(mensaje, 'error');
}

function mostrarInfo(mensaje) {
    mostrarToast(mensaje, 'info');
}

// ===== MODAL =====
function abrirModal(grupo) {
    document.getElementById('grupoNuevo').value = grupo;
    document.getElementById('nombreNuevo').value = '';
    document.getElementById('modalAgregarMiembro').classList.add('show');
}

function cerrarModal() {
    document.getElementById('modalAgregarMiembro').classList.remove('show');
}

function cerrarModalAsistencia() {
    document.getElementById('modalAsistencia').classList.remove('show');
    miembroEnEdicion = null;
    grupoEnEdicion = null;
}

function agregarMiembroCoro() {
    abrirModalAgregarMiembro('coro');
}

function agregarMiembroOrquesta() {
    abrirModalAgregarMiembro('orquesta');
}

// ===== GUARDAR NUEVO MIEMBRO =====
async function guardarNuevoMiembro(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreNuevo').value;
    const grupo = document.getElementById('grupoNuevo').value;
    const instrumento = document.getElementById('instrumentoNuevo').value;
    const voz = document.getElementById('vozNueva').value;
    
    if (!nombre) {
        mostrarError('El nombre es requerido');
        return;
    }
    
    if (grupo === 'orquesta' && !instrumento) {
        mostrarError('Debe seleccionar un instrumento');
        return;
    }
    
    if (grupo === 'coro' && !voz) {
        mostrarError('Debe seleccionar una voz');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/asistencia/miembro/nuevo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: nombre,
                grupo: grupo,
                instrumento: grupo === 'orquesta' ? instrumento : null,
                voz: grupo === 'coro' ? voz : null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            cerrarModal();
            mostrarMensajeExito('Miembro agregado correctamente');
            cargarMiembros(grupo);
        } else {
            mostrarError(data.error || 'Error al agregar miembro');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al agregar miembro');
    }
}

// ===== CERRAR MODALES CON CLICK FUERA =====
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalAgregarMiembro');
    const modalAsistencia = document.getElementById('modalAsistencia');
    
    if (e.target === modal) {
        cerrarModal();
    }
    
    if (e.target === modalAsistencia) {
        cerrarModalAsistencia();
    }
});

// ===== CERRAR MODALES CON ESC =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarModal();
        cerrarModalAsistencia();
    }
});