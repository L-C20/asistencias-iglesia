console.log('🚀 REPORTES.JS CARGANDO');

var grupoActual = 'coro';
var datosEventoActual = [];

// ===== VERIFICAR ELEMENTO =====
function verificarElemento(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn('⚠️ Elemento NO encontrado:', id);
        return false;
    }
    console.log('✅ Elemento OK:', id);
    return true;
}

// ===== CARGAR REPORTE POR GRUPO =====
window.cargarReporteGrupo = function(grupo, autoLoad) {
    console.log('👁️ cargarReporteGrupo:', grupo, 'autoLoad:', autoLoad);
    
    grupoActual = grupo;
    
    if (autoLoad) {
        console.log('⚙️ AutoLoad - solo conteos');
        cargarConteos(grupo);
        return;
    }
    
    // Actualizar botones
    const botones = document.querySelectorAll('.grupo-btn');
    if (botones.length === 0) {
        console.error('❌ No hay botones .grupo-btn');
        return;
    }
    
    botones.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Mostrar tarjetas
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    if (vistaTarjetas) {
        vistaTarjetas.style.display = 'block';
        console.log('✅ Mostrando tarjetas');
    }
    if (vistaDetalle) {
        vistaDetalle.style.display = 'none';
        console.log('✅ Ocultando detalle');
    }
    
    cargarConteos(grupo);
};

// ===== CARGAR CONTEOS =====
function cargarConteos(grupo) {
    console.log('📊 Conteos:', grupo);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    // Verificar elementos
    if (!document.getElementById('countSantoCulto')) {
        console.error('❌ countSantoCulto no existe');
        return;
    }
    
    fetch(`/api/reportes/conteos/${grupo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('📦 Conteos recibidos:', data);
        
        const els = ['countSantoCulto', 'countEnsayo', 'countBautismo'];
        const keys = ['santo_culto', 'ensayo', 'bautismo'];
        
        els.forEach((el, i) => {
            const elem = document.getElementById(el);
            if (elem) {
                elem.textContent = data[keys[i]] || '0';
            }
        });
    })
    .catch(err => console.error('❌ Error:', err));
}

// ===== ABRIR EVENTO =====
window.abrirReporteEvento = function(tipoEvento) {
    console.log('🎯 Evento:', tipoEvento);
    
    // Verificar elementos críticos
    if (!document.getElementById('vistaTarjetas')) {
        console.error('❌ vistaTarjetas no existe');
        return;
    }
    if (!document.getElementById('vistaDetalle')) {
        console.error('❌ vistaDetalle no existe');
        return;
    }
    if (!document.getElementById('tablaDetalleBody')) {
        console.error('❌ tablaDetalleBody no existe');
        return;
    }
    
    const nombres = {
        'santo_culto': 'Santo Culto',
        'ensayo': 'Ensayos',
        'bautismo': 'Bautismo'
    };
    
    document.getElementById('vistaTarjetas').style.display = 'none';
    document.getElementById('vistaDetalle').style.display = 'block';
    
    const titulo = document.getElementById('detalleEventoTitulo');
    if (titulo) titulo.textContent = nombres[tipoEvento];
    
    cargarDatos(tipoEvento);
    window.scrollTo(0, 0);
};

// ===== CARGAR DATOS =====
function cargarDatos(tipoEvento) {
    console.log('📋 Datos:', tipoEvento);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    const url = `/api/reportes/evento/${grupoActual}?tipo_evento=${tipoEvento}`;
    console.log('📡 URL:', url);
    
    fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('✅ Datos:', data.length, 'registros');
        datosEventoActual = data;
        renderizarTabla(data);
    })
    .catch(err => console.error('❌ Error:', err));
}

// ===== RENDERIZAR TABLA =====
function renderizarTabla(datos) {
    const tbody = document.getElementById('tablaDetalleBody');
    if (!tbody) {
        console.error('❌ tablaDetalleBody no existe');
        return;
    }
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Sin datos</td></tr>';
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
    
    console.log('✅ Tabla:', datos.length, 'filas');
}

// ===== VOLVER =====
window.volverATarjetas = function() {
    console.log('🔙 Volver');
    
    const vistaTarjetas = document.getElementById('vistaTarjetas');
    const vistaDetalle = document.getElementById('vistaDetalle');
    
    if (vistaTarjetas) vistaTarjetas.style.display = 'block';
    if (vistaDetalle) vistaDetalle.style.display = 'none';
    
    window.limpiarFiltrosDetalle();
};

// ===== FILTROS =====
window.aplicarFiltrosDetalle = function() {
    console.log('🔍 Filtros');
    
    const fecha = document.getElementById('filtroFecha');
    const estado = document.getElementById('filtroEstado');
    
    if (!fecha || !estado) {
        console.error('❌ Filtros no existen');
        return;
    }
    
    let datos = datosEventoActual;
    
    if (fecha.value) {
        datos = datos.filter(item => item.fecha === fecha.value);
        const d = new Date(fecha.value + 'T00:00:00');
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const diaSemana = document.getElementById('diaSemana');
        if (diaSemana) diaSemana.textContent = `(${dias[d.getDay()]})`;
    }
    
    if (estado.value === 'true') {
        datos = datos.filter(item => item.presente);
    } else if (estado.value === 'false') {
        datos = datos.filter(item => !item.presente && !item.justified);
    } else if (estado.value === 'justified') {
        datos = datos.filter(item => item.justified);
    }
    
    renderizarTabla(datos);
};

window.limpiarFiltrosDetalle = function() {
    console.log('🧹 Limpiar');
    
    const fecha = document.getElementById('filtroFecha');
    const estado = document.getElementById('filtroEstado');
    const diaSemana = document.getElementById('diaSemana');
    
    if (fecha) fecha.value = '';
    if (estado) estado.value = '';
    if (diaSemana) diaSemana.textContent = '';
    
    renderizarTabla(datosEventoActual);
};

console.log('✅ REPORTES.JS LISTO');