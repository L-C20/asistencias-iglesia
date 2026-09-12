console.log('✅ reportes.js CARGANDO - VERSIÓN FUNCIONAL');

var grupoReporte = 'coro';
var datosReporte = [];

// ===== CARGAR GRUPO =====
window.cargarReporteGrupo = function(grupo, autoLoad) {
    console.log('🔵 cargarReporteGrupo:', grupo, 'autoLoad:', autoLoad);
    
    grupoReporte = grupo;
    
    // Solo actualizar UI si no es autoLoad
    if (!autoLoad) {
        document.querySelectorAll('.grupo-btn').forEach(b => b.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }
        
        const vT = document.getElementById('vistaTarjetas');
        const vD = document.getElementById('vistaDetalle');
        if (vT) vT.style.display = 'block';
        if (vD) vD.style.display = 'none';
    }
    
    // Cargar conteos
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    console.log('📡 Fetch conteos:', grupo);
    
    fetch(`/api/reportes/conteos/${grupo}`, {
        headers: {'Authorization': `Bearer ${token}`}
    })
    .then(r => r.json())
    .then(d => {
        console.log('📊 Conteos recibidos:', d);
        
        const el1 = document.getElementById('countSantoCulto');
        const el2 = document.getElementById('countEnsayo');
        const el3 = document.getElementById('countBautismo');
        
        if (el1) el1.textContent = d.santo_culto || 0;
        if (el2) el2.textContent = d.ensayo || 0;
        if (el3) el3.textContent = d.bautismo || 0;
        
        console.log('✅ Conteos mostrados');
    })
    .catch(e => console.error('❌ Error conteos:', e));
};

// ===== ABRIR EVENTO =====
window.abrirReporteEvento = function(tipo) {
    console.log('🟢 abrirReporteEvento:', tipo);
    
    const nombres = {
        'santo_culto': 'Santo Culto',
        'ensayo': 'Ensayos',
        'bautismo': 'Bautismo'
    };
    
    const vT = document.getElementById('vistaTarjetas');
    const vD = document.getElementById('vistaDetalle');
    
    if (vT) vT.style.display = 'none';
    if (vD) vD.style.display = 'block';
    
    const tit = document.getElementById('detalleEventoTitulo');
    if (tit) tit.textContent = nombres[tipo] || tipo;
    
    // Cargar datos
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('❌ Sin token');
        return;
    }
    
    const url = `/api/reportes/evento/${grupoReporte}?tipo_evento=${tipo}`;
    console.log('📡 Fetch evento:', url);
    
    fetch(url, {
        headers: {'Authorization': `Bearer ${token}`}
    })
    .then(r => r.json())
    .then(d => {
        console.log('✅ Datos recibidos:', d.length, 'registros');
        datosReporte = d;
        
        const tb = document.getElementById('tablaDetalleBody');
        if (!tb) {
            console.error('❌ No existe tablaDetalleBody');
            return;
        }
        
        if (!d || d.length === 0) {
            tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Sin datos para este evento</td></tr>';
            return;
        }
        
        tb.innerHTML = d.map(item => `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `).join('');
        
        console.log('✅ Tabla renderizada');
    })
    .catch(e => console.error('❌ Error evento:', e));
};

// ===== VOLVER =====
window.volverATarjetas = function() {
    console.log('🔙 Volver a tarjetas');
    
    const vT = document.getElementById('vistaTarjetas');
    const vD = document.getElementById('vistaDetalle');
    
    if (vT) vT.style.display = 'block';
    if (vD) vD.style.display = 'none';
    
    window.limpiarFiltrosDetalle();
};

// ===== FILTROS =====
window.aplicarFiltrosDetalle = function() {
    console.log('🔍 Aplicar filtros');
    
    const fecha = document.getElementById('filtroFecha');
    const estado = document.getElementById('filtroEstado');
    
    if (!fecha || !estado) {
        console.error('❌ No existen elementos de filtro');
        return;
    }
    
    let datos = datosReporte;
    
    if (fecha.value) {
        datos = datos.filter(i => i.fecha === fecha.value);
        
        const d = new Date(fecha.value + 'T00:00:00');
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const diaSemana = document.getElementById('diaSemana');
        if (diaSemana) diaSemana.textContent = `(${dias[d.getDay()]})`;
    }
    
    if (estado.value === 'true') {
        datos = datos.filter(i => i.presente);
    } else if (estado.value === 'false') {
        datos = datos.filter(i => !i.presente && !i.justified);
    } else if (estado.value === 'justified') {
        datos = datos.filter(i => i.justified);
    }
    
    const tb = document.getElementById('tablaDetalleBody');
    if (tb) {
        tb.innerHTML = datos.map(item => `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `).join('');
    }
};

window.limpiarFiltrosDetalle = function() {
    console.log('🧹 Limpiar filtros');
    
    const fecha = document.getElementById('filtroFecha');
    const estado = document.getElementById('filtroEstado');
    const diaSemana = document.getElementById('diaSemana');
    
    if (fecha) fecha.value = '';
    if (estado) estado.value = '';
    if (diaSemana) diaSemana.textContent = '';
    
    const tb = document.getElementById('tablaDetalleBody');
    if (tb) {
        tb.innerHTML = datosReporte.map(item => `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `).join('');
    }
};

console.log('✅ REPORTES.JS LISTO - todas las funciones definidas');