// Variables globales
let grupoActual = 'coro';
let eventoActual = null;
let datosEventoActual = [];

// API URL
const API_URL = window.location.protocol + '//' + window.location.host + '/api';

// ===== CARGAR REPORTES POR GRUPO =====
async function cargarReporteGrupo(grupo) {
    grupoActual = grupo;
    eventoActual = null;
    
    console.log(`📊 Cargando reportes para ${grupo}`);
    
    // Actualizar botones activos
    document.querySelectorAll('.grupo-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.grupo-btn').classList.add('active');
    
    // Mostrar tarjetas y ocultar detalle
    document.getElementById('vistaTarjetas').style.display = 'block';
    document.getElementById('vistaDetalle').style.display = 'none';
    
    // Cargar conteos de eventos
    await cargarConteosEventos(grupo);
}

// ===== CARGAR CONTEOS DE EVENTOS =====
async function cargarConteosEventos(grupo) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reportes/conteos/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('❌ Error cargando conteos');
            return;
        }
        
        const data = await response.json();
        console.log('📈 Conteos:', data);
        
        // Actualizar tarjetas con conteos
        document.getElementById('countSantoCulto').textContent = data.santo_culto || '0';
        document.getElementById('countEnsayo').textContent = data.ensayo || '0';
        document.getElementById('countBautismo').textContent = data.bautismo || '0';
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ===== ABRIR REPORTE DE EVENTO =====
async function abrirReporteEvento(tipoEvento) {
    eventoActual = tipoEvento;
    console.log(`🎯 Abriendo reporte de ${tipoEvento}`);
    
    // Obtener nombre del evento
    const nombreEvento = {
        'santo_culto': 'Santo Culto',
        'ensayo': 'Ensayos',
        'bautismo': 'Bautismo'
    }[tipoEvento];
    
    // Actualizar título
    document.getElementById('detalleEventoTitulo').textContent = nombreEvento;
    
    // Mostrar detalle y ocultar tarjetas
    document.getElementById('vistaTarjetas').style.display = 'none';
    document.getElementById('vistaDetalle').style.display = 'block';
    
    // Cargar datos del evento
    await cargarDatosEvento(tipoEvento);
    
    // Renderizar tabla
    renderizarTablaDetalle(datosEventoActual);
}

// ===== CARGAR DATOS DEL EVENTO =====
async function cargarDatosEvento(tipoEvento) {
    try {
        const token = localStorage.getItem('token');
        
        // Construir URL con parámetros
        const url = new URL(`${API_URL}/reportes/evento/${grupoActual}`, window.location.origin);
        url.searchParams.append('tipo_evento', tipoEvento);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('❌ Error cargando datos');
            return;
        }
        
        const data = await response.json();
        console.log('📋 Datos evento:', data);
        
        datosEventoActual = data;
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ===== RENDERIZAR TABLA DETALLADA =====
function renderizarTablaDetalle(datos) {
    const tbody = document.getElementById('tablaDetalleBody');
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay datos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = datos.map(item => `
        <tr>
            <td>${item.nombre} ${item.apellido || ''}</td>
            <td>${item.instrumento || item.voz || '-'}</td>
            <td>${item.presente ? '✓' : '-'}</td>
            <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
            <td>${item.justified ? '✓' : '-'}</td>
        </tr>
    `).join('');
    
    console.log('✅ Tabla renderizada');
}

// ===== APLICAR FILTROS AL DETALLE =====
function aplicarFiltrosDetalle() {
    const filtroFecha = document.getElementById('filtroFecha').value;
    const filtroEstado = document.getElementById('filtroEstado').value;
    
    console.log(`🔍 Filtrando: fecha=${filtroFecha}, estado=${filtroEstado}`);
    
    let datosFiltrados = datosEventoActual;
    
    // Filtrar por fecha
    if (filtroFecha) {
        datosFiltrados = datosFiltrados.filter(item => {
            return item.fecha === filtroFecha;
        });
        
        // Mostrar día de la semana
        const fecha = new Date(filtroFecha + 'T00:00:00');
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diaNombre = dias[fecha.getDay()];
        document.getElementById('diaSemana').textContent = `(${diaNombre})`;
    } else {
        document.getElementById('diaSemana').textContent = '';
    }
    
    // Filtrar por estado
    if (filtroEstado !== '') {
        if (filtroEstado === 'true') {
            datosFiltrados = datosFiltrados.filter(item => item.presente);
        } else if (filtroEstado === 'false') {
            datosFiltrados = datosFiltrados.filter(item => !item.presente && !item.justified);
        } else if (filtroEstado === 'justified') {
            datosFiltrados = datosFiltrados.filter(item => item.justified);
        }
    }
    
    renderizarTablaDetalle(datosFiltrados);
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltrosDetalle() {
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('diaSemana').textContent = '';
    renderizarTablaDetalle(datosEventoActual);
}

// ===== VOLVER A TARJETAS =====
function volverATarjetas() {
    eventoActual = null;
    document.getElementById('vistaDetalle').style.display = 'none';
    document.getElementById('vistaTarjetas').style.display = 'block';
    limpiarFiltrosDetalle();
}

// ===== INICIALIZAR =====
window.addEventListener('load', () => {
    console.log('🚀 Reportes inicializado');
    cargarReporteGrupo('coro');
});