// ===== VARIABLES GLOBALES =====
let token = localStorage.getItem('token');
let API_URL = window.location.origin === 'http://localhost:3000' 
    ? 'http://localhost:3000/api' 
    : '/api';

// ===== INICIALIZAR APLICACIÓN =====
function initApp() {
    console.log('initApp() llamado');
    
    const storedToken = localStorage.getItem('token');
    const storedUsuario = localStorage.getItem('usuario');
    
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    // Validar que existan los elementos
    if (!loginPage || !dashboardPage) {
        console.error('Error: No se encontraron los elementos loginPage o dashboardPage en el HTML');
        return;
    }
    
    // Si hay token, mostrar dashboard
    if (storedToken) {
        token = storedToken;
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'flex';
        
        const usuarioActual = document.getElementById('usuarioActual');
        if (usuarioActual) {
            usuarioActual.textContent = `Bienvenido: ${storedUsuario || 'Usuario'}`;
        }
        
        // Cargar datos iniciales
        setTimeout(() => {
            if (typeof cargarConteosMiembros === 'function') {
                cargarConteosMiembros();
            }
            if (typeof cargarReporteGrupo === 'function') {
                cargarReporteGrupo('coro', true);
            }
        }, 500);
    } else {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }
    
    // Eventos del login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
    }
    
    // Botón logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Form evento
    const formEvento = document.getElementById('formConfigurarEvento');
    if (formEvento) {
        formEvento.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const tipoEventoRadio = document.querySelector('input[name="tipoEvento"]:checked');
            const fechaEventoEl = document.getElementById('fechaEventoModal');
            
            if (!tipoEventoRadio || !fechaEventoEl) {
                mostrarError('Error: Faltan elementos del formulario');
                return;
            }
            
            const tipoEvento = tipoEventoRadio.value;
            const fechaEvento = fechaEventoEl.value;
            
            if (!fechaEvento) {
                mostrarError('Selecciona una fecha');
                return;
            }
            
            // Guardar configuración
            window.tipoEventoSeleccionado = tipoEvento;
            window.fechaEventoSeleccionada = fechaEvento;
            
            // Cambiar a tab asistencia
            if (typeof grupoActual !== 'undefined') {
                const grupoNombre = grupoActual.charAt(0).toUpperCase() + grupoActual.slice(1);
                const titleEl = document.getElementById('asistenciaTitle');
                if (titleEl) {
                    titleEl.textContent = `Registrar Asistencia - ${grupoNombre}`;
                }
                cambiarTab('asistencia');
                cerrarModalEvento();
                
                if (typeof cargarMiembrosParaAsistencia === 'function') {
                    cargarMiembrosParaAsistencia(grupoActual);
                }
                mostrarToast('Configuración guardada', 'success');
            }
        });
    }
}

// ===== LOGIN =====
async function loginUser(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', usuario);
            token = data.token;
            
            const loginPage = document.getElementById('loginPage');
            const dashboardPage = document.getElementById('dashboardPage');
            
            if (loginPage && dashboardPage) {
                loginPage.style.display = 'none';
                dashboardPage.style.display = 'flex';
            }
            
            const usuarioActual = document.getElementById('usuarioActual');
            if (usuarioActual) {
                usuarioActual.textContent = `Bienvenido: ${usuario}`;
            }
            
            mostrarToast('Login exitoso', 'success');
            cargarConteosMiembros();
        } else {
            mostrarError(data.error || 'Error en el login');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error en la conexión');
    }
}

// ===== LOGOUT =====
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    token = null;
    
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    if (loginPage && dashboardPage) {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }
    
    document.getElementById('loginForm').reset();
    mostrarToast('Sesión cerrada', 'success');
}

// ===== CAMBIAR TAB =====
function cambiarTab(tabName) {
    // Ocultar todas las tabs
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover active de todos los menu items
    const allMenuItems = document.querySelectorAll('.sidebar-menu-item');
    allMenuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar la tab seleccionada
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Marcar menu item como activo
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    
    if (tabName === 'inicio' && menuItems[0]) {
        menuItems[0].classList.add('active');
    } else if (tabName === 'coro-miembros' && menuItems[1]) {
        menuItems[1].classList.add('active');
        if (typeof cargarMiembrosPorFiltro === 'function') {
            setTimeout(() => cargarMiembrosPorFiltro('coro'), 100);
        }
    } else if (tabName === 'orquesta-miembros' && menuItems[2]) {
        menuItems[2].classList.add('active');
        if (typeof cargarMiembrosPorFiltro === 'function') {
            setTimeout(() => cargarMiembrosPorFiltro('orquesta'), 100);
        }
    } else if (tabName === 'reportes' && menuItems[3]) {
        menuItems[3].classList.add('active');
    }
    
    cerrarSidebarMobil();
}

// ===== SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

function cerrarSidebarMobil() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('show');
    }
}

// ===== MODALES =====
function cerrarModalEvento() {
    const modal = document.getElementById('modalConfigurarEvento');
    if (modal) {
        modal.classList.remove('show');
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalAgregarMiembro');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('formNuevoMiembro').reset();
}

// ===== NOTIFICACIONES =====
function mostrarError(mensaje) {
    mostrarToast(mensaje, 'error');
}

function mostrarToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span class="toast-message">${mensaje}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== EJECUTAR CUANDO EL DOM ESTÉ LISTO =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}