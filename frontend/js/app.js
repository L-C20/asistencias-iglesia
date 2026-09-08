// ===== VARIABLES GLOBALES =====
let token = null;
const API_URL = 'https://asistencias-iglesia-production.up.railway.app/api';

// ===== LOGIN =====
async function loginUser() {
    const usuario = document.getElementById('usuario')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!usuario || !password) {
        mostrarError('Por favor completa todos los campos');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            localStorage.setItem('usuario', usuario);
            
            const loginPage = document.getElementById('loginPage');
            const dashboardPage = document.getElementById('dashboardPage');
            
            if (loginPage && dashboardPage) {
                loginPage.style.display = 'none';
                dashboardPage.style.display = 'flex';
            }
            
            const usuarioActual = document.getElementById('usuarioActual');
            if (usuarioActual) {
                usuarioActual.textContent = `Bienvenido, ${usuario}`;
            }
            
            setTimeout(() => {
                cargarConteosMiembros();
                cambiarTab('inicio');
            }, 500);
            
            mostrarToast('Sesión iniciada correctamente', 'success');
        } else {
            mostrarError(data.error || 'Credenciales inválidas');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al iniciar sesión');
    }
}

// ===== LOGOUT =====
function logout() {
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    if (loginPage && dashboardPage) {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }
    
    const usuario = document.getElementById('usuario');
    const password = document.getElementById('password');
    if (usuario) usuario.value = '';
    if (password) password.value = '';
    
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
    if (tabName === 'inicio') {
        menuItems[0]?.classList.add('active');
    } else if (tabName === 'asistencia') {
        menuItems[1]?.classList.add('active');
    } else if (tabName === 'reportes') {
        menuItems[2]?.classList.add('active');
    }
    
    // Cerrar sidebar en mobile
    cerrarSidebarMobil();
}

// ===== TOGGLE SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
    if (mainContent) {
        mainContent.classList.toggle('sidebar-collapsed');
    }
}

// ===== CERRAR SIDEBAR MOBILE =====
function cerrarSidebarMobil() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar?.classList.add('collapsed');
    }
}

// ===== CERRAR MODAL GENÉRICO =====
function cerrarModal() {
    const modal = document.getElementById('modalAgregarMiembro');
    if (modal) {
        modal.classList.remove('show');
    }
    const form = document.getElementById('formNuevoMiembro');
    if (form) {
        form.reset();
    }
}

// ===== CERRAR MODAL EVENTO =====
function cerrarModalEvento() {
    const modal = document.getElementById('modalConfigurarEvento');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ===== MOSTRAR ERROR =====
function mostrarError(mensaje) {
    mostrarToast(mensaje, 'error');
}

// ===== MOSTRAR TOAST =====
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span class="toast-icon"></span>
        <span>${mensaje}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3000);
}

// ===== INICIALIZAR APLICACIÓN =====
function initApp() {
    console.log('initApp() llamado');
    
    const storedToken = localStorage.getItem('token');
    const storedUsuario = localStorage.getItem('usuario');
    
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    console.log('loginPage:', loginPage);
    console.log('dashboardPage:', dashboardPage);
    
    // Validar que existan los elementos
    if (!loginPage || !dashboardPage) {
        console.error('Error: No se encontraron los elementos loginPage o dashboardPage en el HTML');
        console.error('loginPage exists:', !!loginPage);
        console.error('dashboardPage exists:', !!dashboardPage);
        return;
    }
    
    // Si hay token guardado, mostrar dashboard
    if (storedToken && storedUsuario) {
        token = storedToken;
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'flex';
        
        const usuarioActual = document.getElementById('usuarioActual');
        if (usuarioActual) {
            usuarioActual.textContent = `Bienvenido, ${storedUsuario}`;
        }
        
        // Cargar datos
        setTimeout(() => {
            if (typeof cargarConteosMiembros === 'function') {
                cargarConteosMiembros();
            }
            cambiarTab('inicio');
        }, 300);
    } else {
        // Mostrar login
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Form login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loginUser();
        });
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

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // El DOM ya está cargado (scripts al final del body)
    initApp();
}

// ===== DETECTAR CAMBIO DE TAMAÑO =====
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        sidebar?.classList.remove('collapsed');
    }
});