console.log('✅ reportes.js SE CARGÓ - funciones definidas');

var grupoActual = 'coro';
var datosEventoActual = [];
var token = localStorage.getItem('token');

// ===== CARGAR GRUPO =====
window.cargarReporteGrupo = function(grupo, autoLoad) {
    console.log('🔵 cargarReporteGrupo -', grupo, '- autoLoad:', autoLoad);
    grupoActual = grupo;
    
    // Cambiar botones activos
    document.querySelectorAll('.grupo-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Mostrar tarjetas, ocultar detalle
    const vT = document.getElementById('vistaTarjetas');
    const vD = document.getElementById('vistaDetalle');
    if (vT) vT.style.display = 'block';
    if (vD) vD.style.display = 'none';
    
    // Cargar conteos
    fetch(`/api/reportes/conteos/${grupo}`, {
        headers: {'Authorization': `Bearer ${token}`}
    })
    .then(r => r.json())
    .then(d => {
        console.log('📊 Conteos:', d);
        document.getElementById('countSantoCulto').textContent = d.santo_culto || 0;
        document.getElementById('countEnsayo').textContent = d.ensayo || 0;
        document.getElementById('countBautismo').textContent = d.bautismo || 0;
    })
    .catch(e => console.error('❌', e));
};

// ===== ABRIR EVENTO =====
window.abrirReporteEvento = function(tipo) {
    console.log('🟢 abrirReporteEvento -', tipo);
    
    const nom = {'santo_culto': 'Santo Culto', 'ensayo': 'Ensayos', 'bautismo': 'Bautismo'}[tipo];
    
    // Ocultar tarjetas, mostrar detalle
    const vT = document.getElementById('vistaTarjetas');
    const vD = document.getElementById('vistaDetalle');
    if (vT) vT.style.display = 'none';
    if (vD) vD.style.display = 'block';
    
    const tit = document.getElementById('detalleEventoTitulo');
    if (tit) tit.textContent = nom;
    
    console.log('📡 Fetching evento:', tipo);
    
    fetch(`/api/reportes/evento/${grupoActual}?tipo_evento=${tipo}`, {
        headers: {'Authorization': `Bearer ${token}`}
    })
    .then(r => r.json())
    .then(d => {
        console.log('✅ Datos recibidos:', d.length, 'registros');
        datosEventoActual = d;
        
        const tb = document.getElementById('tablaDetalleBody');
        if (!tb) {
            console.error('❌ tablaDetalleBody no existe');
            return;
        }
        
        if (!d || d.length === 0) {
            tb.innerHTML = '<tr><td colspan="5" style="text-align:center">Sin datos</td></tr>';
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
    .catch(e => console.error('❌ Error:', e));
};

// ===== VOLVER =====
window.volverATarjetas = function() {
    console.log('🔙 Volver a tarjetas');
    const vT = document.getElementById('vistaTarjetas');
    const vD = document.getElementById('vistaDetalle');
    if (vT) vT.style.display = 'block';
    if (vD) vD.style.display = 'none';
};

// ===== FILTROS =====
window.aplicarFiltrosDetalle = function() {
    console.log('🔍 Aplicar filtros');
    const fecha = document.getElementById('filtroFecha').value;
    const estado = document.getElementById('filtroEstado').value;
    
    let datos = datosEventoActual;
    
    if (fecha) {
        datos = datos.filter(i => i.fecha === fecha);
        const d = new Date(fecha + 'T00:00:00');
        const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
        const dia = document.getElementById('diaSemana');
        if (dia) dia.textContent = `(${dias[d.getDay()]})`;
    }
    
    if (estado === 'true') datos = datos.filter(i => i.presente);
    else if (estado === 'false') datos = datos.filter(i => !i.presente && !i.justified);
    else if (estado === 'justified') datos = datos.filter(i => i.justified);
    
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
    console.log('🧹 Limpiar');
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('diaSemana').textContent = '';
    
    const tb = document.getElementById('tablaDetalleBody');
    if (tb) {
        tb.innerHTML = datosEventoActual.map(item => `
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