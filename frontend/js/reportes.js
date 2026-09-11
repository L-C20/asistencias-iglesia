// Variables globales
let grupoActual = 'coro';
let eventoActual = null;
let datosEventoActual = [];

// API URL
const API_URL = window.location.protocol + '//' + window.location.host + '/api';

console.log('📊 Reportes.js cargado - API_URL:', API_URL);

// ===== CARGAR REPORTES POR GRUPO =====
async function cargarReporteGrupo(grupo) {
    grupoActual = grupo;
    eventoActual = null;
    
    console.log(`📊 Cargando reportes para ${grupo}`);
    
    // Actualizar botones activos
    document.querySelectorAll('.grupo-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
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
        if (!token) {
            console.error('❌ No hay token');
            return;
        }
        
        const url = `${API_URL}/reportes/conteos/${grupo}`;
        console.log('📡 Fetching:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('❌ Error:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('📈 Conteos:', data);
        
        // Actualizar tarjetas con conteos
        document.getElementById('countSantoCulto').textContent = data.santo_culto || '0';
        document.getElementById('countEnsayo').textContent = data.ensayo || '0';
        document.getElementById('countBautismo').textContent = data.bautismo || '0';
        
    } catch (error) {
        console.error('❌ Error en conteos:', error);
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
    
    // Scroll al top
    window.scrollTo(0, 0);
    
    // Cargar datos del evento
    await cargarDatosEvento(tipoEvento);
    
    // Renderizar tabla
    renderizarTablaDetalle(datosEventoActual);
}

// ===== CARGAR DATOS DEL EVENTO =====
async function cargarDatosEvento(tipoEvento) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No hay token');
            return;
        }
        
        // Construir URL con parámetros
        const url = `${API_URL}/reportes/evento/${grupoActual}?tipo_evento=${tipoEvento}`;
        console.log('📡 Fetching:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.error('❌ Error:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('📋 Datos evento:', data);
        
        datosEventoActual = data;
        
    } catch (error) {
        console.error('❌ Error en evento:', error);
    }
}

// ===== RENDERIZAR TABLA DETALLADA =====
function renderizarTablaDetalle(datos) {
    const tbody = document.getElementById('tablaDetalleBody');
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px;">No hay datos disponibles</td></tr>';
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
    window.scrollTo(0, 0);
}

// ===== INICIALIZAR =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Reportes inicializado');
    cargarReporteGrupo('coro');
});