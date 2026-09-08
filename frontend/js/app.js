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
    
    if (window.innerWidth <= 768 && 
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

// ===== CAMBIAR TAB =====
function cambiarTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los items del sidebar
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activar tab seleccionado
    document.getElementById(tabName).classList.add('active');
    
    // Activar item del sidebar
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    if (tabName === 'coro') menuItems[0].classList.add('active');
    else if (tabName === 'orquesta') menuItems[1].classList.add('active');
    else if (tabName === 'reportes') menuItems[2].classList.add('active');
}

// ===== MODAL FUNCTIONS =====
function cerrarModal() {
    document.getElementById('modalAgregarMiembro').classList.remove('show');
}

function cerrarModalAsistencia() {
    document.getElementById('modalAsistencia').classList.remove('show');
    miembroEnEdicion = null;
    grupoEnEdicion = null;
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

// ===== LOGOUT =====
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
}

// ===== MOSTRAR USUARIO ACTUAL =====
function mostrarUsuario() {
    const userSpan = document.getElementById('usuarioActual');
    if (userSpan && usuarioActual) {
        userSpan.textContent = `${usuarioActual.usuario}`;
    }
}

// ===== FECHAS POR DEFECTO =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fechaCoro').valueAsDate = new Date();
    document.getElementById('fechaOrquesta').valueAsDate = new Date();
    
    // Cargar miembros de coro automáticamente
    setTimeout(() => {
        cargarMiembros('coro');
    }, 500);
});