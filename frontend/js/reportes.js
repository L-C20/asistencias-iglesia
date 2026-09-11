// Variables globales
let grupoActual = 'coro';
let datosEventoActual = [];

console.log('✅ reportes.js cargado');

// ===== CARGAR REPORTE POR GRUPO =====
function cargarReporteGrupo(grupo) {
    console.log('👁️ cargarReporteGrupo llamado con:', grupo);
    
    grupoActual = grupo;
    
    // Actualizar botones
    const botones = document.querySelectorAll('.grupo-btn');
    console.log('🔘 Botones encontrados:', botones.length);
    
    botones.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // El botón que se clickeó
    event.target.classList.add('active');
    
    // Mostrar/ocultar vistas
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    console.log('👀 vistaTarjetas:', vistaTarjetas ? '✓' : '✗');
    console.log('👀 vistaDetalle:', vistaDetalle ? '✓' : '✗');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'block';
    if (vistaDetalle) vistaDetalle.style.display = 'none';
    
    // Cargar conteos
    cargarConteos(grupo);
}

// ===== CARGAR CONTEOS =====
function cargarConteos(grupo) {
    console.log('📊 Cargando conteos para:', grupo);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ No hay token');
        return;
    }
    
    const url = `/api/reportes/conteos/${grupo}`;
    console.log('🌐 URL:', url);
    
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        console.log('📨 Response:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('📦 Data recibida:', data);
        
        document.getElementById('countSantoCulto').textContent = data.santo_culto || '0';
        document.getElementById('countEnsayo').textContent = data.ensayo || '0';
        document.getElementById('countBautismo').textContent = data.bautismo || '0';
        
        console.log('✅ Conteos actualizados');
    })
    .catch(error => {
        console.error('❌ Error:', error);
    });
}

// ===== ABRIR REPORTE DE EVENTO =====
function abrirReporteEvento(tipoEvento) {
    console.log('🎯 abrirReporteEvento llamado:', tipoEvento);
    
    const nombreEvento = {
        'santo_culto': 'Santo Culto',
        'ensayo': 'Ensayos',
        'bautismo': 'Bautismo'
    }[tipoEvento];
    
    console.log('📝 Nombre evento:', nombreEvento);
    
    // Mostrar/ocultar vistas
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    const titulo = document.getElementById('detalleEventoTitulo');
    
    console.log('👀 vistaTarjetas:', vistaTarjetas ? '✓' : '✗');
    console.log('👀 vistaDetalle:', vistaDetalle ? '✓' : '✗');
    console.log('👀 titulo:', titulo ? '✓' : '✗');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'none';
    if (vistaDetalle) vistaDetalle.style.display = 'block';
    if (titulo) titulo.textContent = nombreEvento;
    
    // Cargar datos
    cargarDatos(tipoEvento);
    
    // Scroll
    window.scrollTo(0, 0);
}

// ===== CARGAR DATOS =====
function cargarDatos(tipoEvento) {
    console.log('📋 Cargando datos para:', tipoEvento);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ No hay token');
        return;
    }
    
    const url = `/api/reportes/evento/${grupoActual}?tipo_evento=${tipoEvento}`;
    console.log('🌐 URL:', url);
    
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        console.log('📨 Response:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('📦 Data recibida:', data);
        datosEventoActual = data;
        renderizarTabla(data);
        console.log('✅ Tabla renderizada');
    })
    .catch(error => {
        console.error('❌ Error:', error);
    });
}

// ===== RENDERIZAR TABLA =====
function renderizarTabla(datos) {
    const tbody = document.getElementById('tablaDetalleBody');
    if (!tbody) {
        console.error('❌ No encontré tablaDetalleBody');
        return;
    }
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px;">No hay datos</td></tr>';
        return;
    }
    
    let html = '';
    datos.forEach(item => {
        html += `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    console.log('✅ Tabla con', datos.length, 'filas');
}

// ===== VOLVER A TARJETAS =====
function volverATarjetas() {
    console.log('🔙 Volviendo a tarjetas');
    
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'block';
    if (vistaDetalle) vistaDetalle.style.display = 'none';
    
    // Limpiar filtros
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('diaSemana').textContent = '';
    
    window.scrollTo(0, 0);
}

// ===== APLICAR FILTROS =====
function aplicarFiltrosDetalle() {
    console.log('🔍 Aplicando filtros');
    
    const fecha = document.getElementById('filtroFecha').value;
    const estado = document.getElementById('filtroEstado').value;
    
    let datos = datosEventoActual;
    
    if (fecha) {
        datos = datos.filter(item => item.fecha === fecha);
        const d = new Date(fecha + 'T00:00:00');
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        document.getElementById('diaSemana').textContent = `(${dias[d.getDay()]})`;
    }
    
    if (estado) {
        if (estado === 'true') {
            datos = datos.filter(item => item.presente);
        } else if (estado === 'false') {
            datos = datos.filter(item => !item.presente && !item.justified);
        } else if (estado === 'justified') {
            datos = datos.filter(item => item.justified);
        }
    }
    
    renderizarTabla(datos);
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltrosDetalle() {
    console.log('🧹 Limpiando filtros');
    
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('diaSemana').textContent = '';
    
    renderizarTabla(datosEventoActual);
}

// ===== INICIALIZAR AL CARGAR =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM listo, cargando reportes por defecto');
        cargarConteos('coro');
    });
} else {
    console.log('🚀 DOM ya está listo');
    cargarConteos('coro');
}