// ===== VARIABLES GLOBALES =====
var token = localStorage.getItem('token');
var usuarioRol = localStorage.getItem('usuarioRol');
var usuarioNombre = localStorage.getItem('usuarioNombre');
var API_URL = window.location.origin === 'http://localhost:3000'
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
        verificarSesion();
        usuarioRol = localStorage.getItem('usuarioRol');
        usuarioNombre = localStorage.getItem('usuarioNombre');

        loginPage.style.display = 'none';
        dashboardPage.style.display = 'flex';

        const usuarioActual = document.getElementById('usuarioActual');
        if (usuarioActual) {
            const nombre = usuarioNombre || storedUsuario || 'Usuario';
            usuarioActual.innerHTML = '';
            const avatar = document.createElement('span');
            avatar.className = 'avatar';
            avatar.textContent = nombre.trim().charAt(0).toUpperCase();
            const etiqueta = document.createElement('span');
            etiqueta.textContent = nombre;
            usuarioActual.append(avatar, etiqueta);
        }

        // Ocultar Configuración si NO es admin
        const configTab = document.querySelector('[onclick*="configuracion"]');
        if (configTab && usuarioRol !== 'admin') {
            configTab.style.display = 'none';
        }

        console.log('✅ Sesión iniciada - Rol:', usuarioRol, '- Cargando datos iniciales');
        
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

            if (typeof cargarResumenInicio === 'function') {
                cargarResumenInicio();
            }
            
            if (typeof cargarReporteGrupo === 'function') {
                console.log('📈 Llamando cargarReporteGrupo("orquesta")');
                cargarReporteGrupo('orquesta');
            } else {
                console.warn('⚠️ cargarReporteGrupo no está definida');
            }

            if (typeof cargarMiembrosPorFiltro === 'function') {
                console.log('👥 Llamando cargarMiembrosPorFiltro');
                cargarMiembrosPorFiltro('orquesta', '');
            }
        }, 800);
    } else {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        console.log('🔐 Sin sesión - Mostrando login');
        const campoUsuario = document.getElementById('usuario');
        if (campoUsuario && !campoUsuario.value) campoUsuario.focus();
    }
}

// Si el token guardado venció o dejó de ser válido, se vuelve al login
// en lugar de quedar en un panel que no carga nada.
async function verificarSesion() {
    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            console.warn('⚠️ Sesión vencida - Volviendo al login');
            cerrarSesionLocal();
            initApp();
            mostrarToast('Tu sesión venció. Ingresá de nuevo.', 'info');
        }
    } catch (e) { /* sin conexión: se deja seguir con lo que hay */ }
}

function cerrarSesionLocal() {
    ['token', 'usuario', 'usuarioRol', 'usuarioNombre'].forEach(k => localStorage.removeItem(k));
    token = null;
    usuarioRol = null;
    usuarioNombre = null;
}

// Ojito de los campos de contraseña: muestra u oculta lo escrito
function alternarClave(boton) {
    const input = boton.parentElement.querySelector('input');
    if (!input) return;
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    boton.classList.toggle('visible', mostrar);
    boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    boton.title = boton.getAttribute('aria-label');
    input.focus();
}

// ===== MANEJAR LOGIN =====
// Único manejador: el form lo llama con onsubmit="handleLogin(event)"
let ingresando = false;

function mostrarErrorLogin(mensaje) {
    const caja = document.getElementById('errorMessage');
    if (!caja) return mostrarError(mensaje);
    caja.textContent = mensaje;
    caja.style.display = mensaje ? 'block' : 'none';
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    if (ingresando) return;

    // El teclado del teléfono suele agregar espacios o mayúsculas
    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnText');
    const loading = document.getElementById('loading');

    mostrarErrorLogin('');

    if (!usuario || !password) {
        mostrarErrorLogin('Completá usuario y contraseña');
        return;
    }

    console.log('🔐 Intentando login como:', usuario);
    ingresando = true;
    if (btnLogin) btnLogin.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (loading) loading.style.display = 'inline-flex';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        let data = {};
        try { data = await response.json(); } catch (_) { /* respuesta sin JSON */ }

        if (response.ok && data.token) {
            token = data.token;
            localStorage.setItem('token', token);
            localStorage.setItem('usuario', data.user?.usuario || usuario);
            localStorage.setItem('usuarioRol', data.rol || 'operario');
            localStorage.setItem('usuarioNombre', data.nombre_completo || usuario);

            console.log('✅ Login exitoso - Rol:', data.rol);
            document.getElementById('password').value = '';
            mostrarToast('Bienvenido ' + (data.nombre_completo || usuario), 'success');
            initApp();
        } else if (response.status === 401) {
            mostrarErrorLogin('Usuario o contraseña incorrectos');
        } else {
            console.error('❌ Login fallido:', response.status, data.error);
            mostrarErrorLogin(data.error || `No se pudo ingresar (error ${response.status})`);
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        mostrarErrorLogin('No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.');
    } finally {
        ingresando = false;
        if (btnLogin) btnLogin.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (loading) loading.style.display = 'none';
    }
}

// ===== LOGOUT =====
async function logout() {
    const ok = await confirmar({
        titulo: 'Cerrar sesión',
        mensaje: '¿Querés salir de la aplicación?',
        confirmar: 'Salir'
    });
    if (!ok) return;

    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('usuarioRol');
    localStorage.removeItem('usuarioNombre');
    token = null;
    location.reload();
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
    const menuItemToActivate = document.querySelector(`.sidebar-menu-item[onclick*="'${nombreTab}'"]`);

    if (menuItemToActivate) {
        menuItemToActivate.classList.add('active');
        console.log('✅ Menú actualizado:', nombreTab);
    }
    
    // Mostrar tab seleccionado
    const tab = document.getElementById(nombreTab);
    if (tab) {
        tab.style.display = 'block';
        console.log('✅ Tab mostrado:', nombreTab);
        
        // Al volver a Inicio, refrescar el resumen (puede venir de guardar asistencias)
        if (nombreTab === 'inicio' && typeof cargarResumenInicio === 'function') {
            cargarResumenInicio();
        }

        // Los reportes pueden haber cambiado: contadores y, si hay un detalle abierto, sus datos
        if (nombreTab === 'reportes' && typeof cargarReporteGrupo === 'function') {
            cargarReporteGrupo('orquesta');
            const detalle = document.getElementById('vistaDetalle');
            if (detalle && detalle.style.display !== 'none' && typeof abrirReporteEvento === 'function') {
                abrirReporteEvento(tipoEventoActual);
            }
        }

        // Si es un tab de miembros, cargar datos
        if (nombreTab === 'orquesta-miembros') {
            console.log('👥 Cargando miembros de orquesta');
            if (typeof cargarMiembrosPorFiltro === 'function') {
                cargarMiembrosPorFiltro('orquesta', '');
            }
        }

        // Si es asistencia, cargar datos
        if (nombreTab.startsWith('asistencia-')) {
            console.log('📋 Preparando asistencia de orquesta');
            if (typeof grupoActual !== 'undefined') {
                grupoActual = 'orquesta';
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
        cerrarSidebar();
    } else {
        console.error('❌ Tab no encontrado:', nombreTab);
    }
}

// ===== MENÚ LATERAL EN MÓVIL =====
// Se abre con la hamburguesa y se cierra tocando fuera, con Escape o al elegir una opción
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const abierto = sidebar.classList.toggle('active');
    document.body.classList.toggle('menu-abierto', abierto);
}

function cerrarSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('active');
    document.body.classList.remove('menu-abierto');
}

// ===== CERRAR SIDEBAR AL HACER CLICK EN UN ITEM =====
function cerrarSidebarAlHacerClick() {
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.addEventListener('click', cerrarSidebar);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarSidebar(); });
}

// ===== MOSTRAR TOAST =====
const ICONOS_TOAST = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
};

function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icono">${ICONOS_TOAST[tipo] || ICONOS_TOAST.info}</span><span class="toast-texto"></span>`;
    toast.querySelector('.toast-texto').textContent = mensaje;

    const cerrar = () => {
        toast.classList.add('saliendo');
        setTimeout(() => toast.remove(), 200);
    };
    toast.addEventListener('click', cerrar);
    container.appendChild(toast);
    setTimeout(cerrar, tipo === 'error' ? 5000 : 3500);
}

// Diálogo de confirmación propio, en lugar del confirm() del navegador.
// Devuelve una promesa que resuelve true si el usuario confirma.
// Con cancelar: null se comporta como un aviso con un solo botón.
function confirmar({ titulo, mensaje, detalle = '', confirmar = 'Confirmar', cancelar = 'Cancelar', peligroso = false }) {
    return new Promise(resolve => {
        const modal = document.getElementById('modalConfirmar');
        if (!modal) { resolve(window.confirm(mensaje)); return; }

        modal.querySelector('.confirmar-titulo').textContent = titulo;
        modal.querySelector('.confirmar-mensaje').textContent = mensaje;
        modal.querySelector('.confirmar-detalle').innerHTML = detalle;

        const btnOk = modal.querySelector('.confirmar-ok');
        const btnNo = modal.querySelector('.confirmar-no');
        btnOk.textContent = confirmar;
        btnOk.className = `btn confirmar-ok ${peligroso ? 'btn-danger' : 'btn-primary'}`;
        btnNo.textContent = cancelar || '';
        btnNo.hidden = !cancelar;

        const terminar = (valor) => {
            modal.classList.remove('show');
            btnOk.onclick = btnNo.onclick = modal.onclick = null;
            document.removeEventListener('keydown', onKey);
            resolve(valor);
        };
        const onKey = (e) => { if (e.key === 'Escape') terminar(false); };

        btnOk.onclick = () => terminar(true);
        btnNo.onclick = () => terminar(false);
        modal.onclick = (e) => { if (e.target === modal) terminar(false); };
        document.addEventListener('keydown', onKey);

        modal.classList.add('show');
        btnOk.focus();
    });
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