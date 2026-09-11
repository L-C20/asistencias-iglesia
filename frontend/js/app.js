// ===== VARIABLES GLOBALES =====
let token = localStorage.getItem('token');
let API_URL = window.location.origin === 'http://localhost:3000' 
    ? 'http://localhost:3000/api' 
    : '/api';

console.log('🔧 app.js inicializando - API_URL:', API_URL);

// ===== INICIALIZAR APLICACIÓN =====
function initApp() {
    console.log('📱 initApp() llamado');
    
    const storedToken = localStorage.getItem('token');
    const storedUsuario = localStorage.getItem('usuario');
    
    const loginPage = document.getElementById('loginPage');
    const dashboardPage = document.getElementById('dashboardPage');
    
    // Validar que existan los elementos
    if (!loginPage || !dashboardPage) {
        console.error('❌ Error: No se encontraron los elementos loginPage o dashboardPage');
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
        
        console.log('✅ Sesión iniciada - Cargando datos iniciales');
        
        // Activar tab Inicio
        cambiarTab('inicio');
        
        // Cargar datos iniciales con delay
        setTimeout(() => {
            if (typeof cargarConteosMiembros === 'function') {
                console.log('📊 Llamando cargarConteosMiembros()');
                cargarConteosMiembros();
            } else {
                console.warn('⚠️ cargarConteosMiembros no está definida');
            }
            
            if (typeof cargarReporteGrupo === 'function') {
                console.log('📈 Llamando cargarReporteGrupo("coro", true)');
                cargarReporteGrupo('coro', true);
            } else {
                console.warn('⚠️ cargarReporteGrupo no está definida');
            }
            
            if (typeof cargarMiembrosPorFiltro === 'function') {
                console.log('👥 Llamando cargarMiembrosPorFiltro');
                cargarMiembrosPorFiltro('coro', '');
                cargarMiembrosPorFiltro('orquesta', '');
            }
        }, 800);
    } else {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        console.log('🔐 Sin sesión - Mostrando login');
    }
    
    // Eventos del login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// ===== MANEJAR LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    
    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;
    
    console.log('🔐 Intentando login como:', usuario);
    
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
            
            console.log('✅ Login exitoso');
            mostrarToast('Bienvenido ' + usuario, 'success');
            
            // Reinicializar app
            setTimeout(() => {
                initApp();
            }, 500);
        } else {
            console.error('❌ Login fallido:', data.error);
            mostrarError(data.error || 'Usuario o contraseña incorrectos');
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        mostrarError('Error al conectar con el servidor');
    }
}

// ===== LOGOUT =====
function logout() {
    console.log('🚪 [logout] Iniciando logout');
    
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        console.log('✅ Usuario confirmó logout');
        
        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        token = null;
        
        console.log('🧹 LocalStorage limpiado');
        console.log('🔄 Recargando página...');
        
        // Recargar página
        setTimeout(() => {
            location.reload();
        }, 300);
    } else {
        console.log('❌ Usuario canceló logout');
    }
}

// ===== CAMBIAR TAB =====
function cambiarTab(nombreTab) {
    console.log('📑 Cambiando a tab:', nombreTab);
    
    // Ocultar todos los tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remover clase active de todos los items del menú
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Agregar clase active al item correspondiente
    let menuItemToActivate = null;
    if (nombreTab === 'inicio') {
        menuItemToActivate = document.querySelector('.sidebar-menu-item');
    } else if (nombreTab === 'coro-miembros') {
        menuItemToActivate = document.querySelectorAll('.sidebar-menu-item')[1];
    } else if (nombreTab === 'orquesta-miembros') {
        menuItemToActivate = document.querySelectorAll('.sidebar-menu-item')[2];
    } else if (nombreTab === 'reportes') {
        menuItemToActivate = document.querySelectorAll('.sidebar-menu-item')[3];
    } else if (nombreTab === 'configuracion') {
        menuItemToActivate = document.querySelectorAll('.sidebar-menu-item')[4];
    }
    
    if (menuItemToActivate) {
        menuItemToActivate.classList.add('active');
        console.log('✅ Menú actualizado:', nombreTab);
    }
    
    // Mostrar tab seleccionado
    const tab = document.getElementById(nombreTab);
    if (tab) {
        tab.style.display = 'block';
        console.log('✅ Tab mostrado:', nombreTab);
        
        // Si es un tab de miembros, cargar datos
        if (nombreTab === 'coro-miembros' || nombreTab === 'orquesta-miembros') {
            const grupo = nombreTab.includes('coro') ? 'coro' : 'orquesta';
            console.log('👥 Cargando miembros para:', grupo);
            if (typeof cargarMiembrosPorFiltro === 'function') {
                cargarMiembrosPorFiltro(grupo, '');
            }
        }
        
        // Si es asistencia, cargar datos
        if (nombreTab.startsWith('asistencia-')) {
            const grupo = nombreTab.includes('coro') ? 'coro' : 'orquesta';
            console.log('📋 Preparando asistencia para:', grupo);
            if (typeof grupoActual !== 'undefined') {
                grupoActual = grupo;
            }
        }
        
        // Si es configuración, cargar usuarios
        if (nombreTab === 'configuracion') {
            console.log('⚙️ Cargando configuración');
            if (typeof inicializarConfiguracion === 'function') {
                inicializarConfiguracion();
            }
        }
        
        // Cerrar sidebar en móvil
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.remove('active');
            console.log('📱 Sidebar cerrado en móvil');
        }
    } else {
        console.error('❌ Tab no encontrado:', nombreTab);
    }
}

// ===== TOGGLE SIDEBAR (MENÚ HAMBURGUESA) =====
function toggleSidebar() {
    console.log('🍔 Toggle Sidebar');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        console.log('✅ Sidebar toggled');
    } else {
        console.error('❌ Sidebar no encontrado');
    }
}

// ===== CERRAR SIDEBAR AL HACER CLICK EN UN ITEM =====
function cerrarSidebarAlHacerClick() {
    const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && window.innerWidth < 768) {
                sidebar.classList.remove('active');
                console.log('✅ Sidebar cerrado después de click');
            }
        });
    });
}

// ===== MOSTRAR TOAST =====
function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    toast.style.cssText = `
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===== MOSTRAR ERROR =====
function mostrarError(mensaje) {
    console.error('❌ Error:', mensaje);
    mostrarToast(mensaje, 'error');
}

// ===== INICIALIZAR CUANDO CARGA EL DOM =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Loaded - Inicializando aplicación');
    
    // Event listener para botón logout (como respaldo)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Click en botón logout detectado');
            logout();
        });
        console.log('✅ Event listener agregado a logoutBtn');
    } else {
        console.warn('⚠️ logoutBtn no encontrado');
    }
    
    // Verificar que funciones existan
    setTimeout(() => {
        console.log('🔍 Verificando funciones globales:');
        console.log('  - irAAsistencia:', typeof irAAsistencia === 'function' ? '✅' : '❌');
        console.log('  - cambiarTab:', typeof cambiarTab === 'function' ? '✅' : '❌');
        console.log('  - cargarMiembrosPorFiltro:', typeof cargarMiembrosPorFiltro === 'function' ? '✅' : '❌');
        console.log('  - abrirModalAgregarMiembro:', typeof abrirModalAgregarMiembro === 'function' ? '✅' : '❌');
        console.log('  - guardarNuevoMiembro:', typeof guardarNuevoMiembro === 'function' ? '✅' : '❌');
        console.log('  - cargarReporteGrupo:', typeof cargarReporteGrupo === 'function' ? '✅' : '❌');
        console.log('  - toggleSidebar:', typeof toggleSidebar === 'function' ? '✅' : '❌');
        console.log('  - logout:', typeof logout === 'function' ? '✅' : '❌');
    }, 500);
    
    initApp();
    
    // Inicializar sidebar
    setTimeout(() => {
        cerrarSidebarAlHacerClick();
        console.log('✅ Sidebar inicializado');
    }, 300);
});

console.log('✅ app-v10.js CARGADO');