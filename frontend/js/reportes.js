console.log('✅ reportes.js INICIANDO');

// Variables globales - IMPORTANTES: sin let/const
var grupoActual = 'coro';
var datosEventoActual = [];

// ===== CARGAR REPORTE POR GRUPO =====
window.cargarReporteGrupo = function(grupo, autoLoad) {
    console.log('👁️ cargarReporteGrupo:', grupo, 'autoLoad:', autoLoad);
    
    grupoActual = grupo;
    
    if (autoLoad) {
        console.log('⚙️ AutoLoad - cargando conteos');
        cargarConteos(grupo);
        return;
    }
    
    const botones = document.querySelectorAll('.grupo-btn');
    botones.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'block';
    if (vistaDetalle) vistaDetalle.style.display = 'none';
    
    cargarConteos(grupo);
};

// ===== CARGAR CONTEOS =====
function cargarConteos(grupo) {
    console.log('📊 Cargando conteos:', grupo);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    fetch(`/api/reportes/conteos/${grupo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('✅ Conteos:', data);
        document.getElementById('countSantoCulto').textContent = data.santo_culto || '0';
        document.getElementById('countEnsayo').textContent = data.ensayo || '0';
        document.getElementById('countBautismo').textContent = data.bautismo || '0';
    })
    .catch(err => console.error('❌ Error conteos:', err));
}

// ===== ABRIR EVENTO =====
window.abrirReporteEvento = function(tipoEvento) {
    console.log('🎯 abrirReporteEvento:', tipoEvento);
    
    const nombres = {
        'santo_culto': 'Santo Culto',
        'ensayo': 'Ensayos',
        'bautismo': 'Bautismo'
    };
    
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    const titulo = document.getElementById('detalleEventoTitulo');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'none';
    if (vistaDetalle) vistaDetalle.style.display = 'block';
    if (titulo) titulo.textContent = nombres[tipoEvento];
    
    cargarDatos(tipoEvento);
    window.scrollTo(0, 0);
};

// ===== CARGAR DATOS =====
function cargarDatos(tipoEvento) {
    console.log('📋 Cargando datos:', tipoEvento);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    fetch(`/api/reportes/evento/${grupoActual}?tipo_evento=${tipoEvento}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('📦 Datos:', data.length, 'registros');
        datosEventoActual = data;
        renderizarTabla(data);
    })
    .catch(err => console.error('❌ Error datos:', err));
}

// ===== RENDERIZAR TABLA =====
function renderizarTabla(datos) {
    const tbody = document.getElementById('tablaDetalleBody');
    if (!tbody) {
        console.error('❌ tablaDetalleBody no existe');
        return;
    }
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:15px">Sin datos</td></tr>';
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
    
    console.log('✅ Tabla renderizada:', datos.length, 'filas');
}

// ===== VOLVER =====
window.volverATarjetas = function() {
    console.log('🔙 Volver a tarjetas');
    
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'block';
    if (vistaDetalle) vistaDetalle.style.display = 'none';
    
    limpiarFiltrosDetalle();
};

// ===== FILTROS =====
window.aplicarFiltrosDetalle = function() {
    console.log('🔍 Aplicar filtros');
    
    const fecha = document.getElementById('filtroFecha').value;
    const estado = document.getElementById('filtroEstado').value;
    
    let datos = datosEventoActual;
    
    if (fecha) {
        datos = datos.filter(item => item.fecha === fecha);
        const d = new Date(fecha + 'T00:00:00');
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        document.getElementById('diaSemana').textContent = `(${dias[d.getDay()]})`;
    }
    
    if (estado === 'true') {
        datos = datos.filter(item => item.presente);
    } else if (estado === 'false') {
        datos = datos.filter(item => !item.presente && !item.justified);
    } else if (estado === 'justified') {
        datos = datos.filter(item => item.justified);
    }
    
    renderizarTabla(datos);
};

window.limpiarFiltrosDetalle = function() {
    console.log('🧹 Limpiar filtros');
    
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('diaSemana').textContent = '';
    
    renderizarTabla(datosEventoActual);
};

console.log('✅ reportes.js LISTO');