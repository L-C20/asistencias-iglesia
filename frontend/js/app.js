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
    if (document.querySelector('.tab-button')) {
        // Verificar token
        verificarToken();
        
        // Tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('submit', logout);
        
        // Modal
        document.getElementById('formNuevoMiembro').addEventListener('submit', guardarNuevoMiembro);
        
        // Cargar fecha actual
        document.getElementById('fechaCoro').valueAsDate = new Date();
        document.getElementById('fechaOrquesta').valueAsDate = new Date();
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
        userSpan.textContent = `👤 ${usuarioActual.usuario}`;
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
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar tab y botón seleccionado
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
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

function agregarMiembroCoro() {
    abrirModal('coro');
}

function agregarMiembroOrquesta() {
    abrirModal('orquesta');
}

// ===== GUARDAR NUEVO MIEMBRO =====
async function guardarNuevoMiembro(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreNuevo').value;
    const grupo = document.getElementById('grupoNuevo').value;
    
    try {
        const response = await fetch(`${API_URL}/asistencia/miembro/nuevo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nombre, grupo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            cerrarModal();
            mostrarMensajeExito('Miembro agregado correctamente');
            cargarMiembros(grupo);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al agregar miembro');
    }
}

// ===== MENSAJES =====
function mostrarMensajeExito(mensaje) {
    const div = document.createElement('div');
    div.className = 'success-message show';
    div.textContent = mensaje;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.remove();
    }, 3000);
}

// ===== LOGOUT BOTÓN =====
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});