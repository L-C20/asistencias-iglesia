console.log('✅ reportes.js CARGANDO - VERSIÓN FUNCIONAL');

var grupoReporte = 'coro';
var datosReporte = [];
var semanaMostrada = new Date(); // Semana actual por defecto
var tipoEventoActual = 'santo_culto'; // Track current event type

// Días de culto: 2 (martes), 6 (sábado), 0 (domingo)
const DIAS_CULTO = [0, 2, 6];

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

    tipoEventoActual = tipo;

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
    .then(r => {
        if (!r.ok) {
            console.error('❌ Response no OK:', r.status, r.statusText);
            throw new Error(`Error HTTP ${r.status}`);
        }
        return r.json();
    })
    .then(d => {
        console.log('✅ Datos recibidos:', d ? d.length : 0, 'registros');

        if (!d || !Array.isArray(d)) {
            console.error('❌ Datos inválidos:', d);
            const tb = document.getElementById('tablaDetalleBody');
            if (tb) {
                tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Error al cargar datos</td></tr>';
            }
            return;
        }

        datosReporte = d;

        const tb = document.getElementById('tablaDetalleBody');
        if (!tb) {
            console.error('❌ No existe tablaDetalleBody');
            return;
        }

        if (d.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Sin datos para este evento</td></tr>';
            return;
        }

        tb.innerHTML = d.map(item => `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td><strong>${window.obtenerDiaCulto(item.fecha)}</strong></td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `).join('');

        console.log('✅ Tabla renderizada');
    })
    .catch(e => {
        console.error('❌ Error evento:', e);
        const tb = document.getElementById('tablaDetalleBody');
        if (tb) {
            tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:red">Error: ' + e.message + '</td></tr>';
        }
    });
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
    console.log('🔍 Aplicar filtros por semana');

    const estado = document.getElementById('filtroEstado');

    if (!estado) {
        console.error('❌ No existen elementos de filtro');
        return;
    }

    let datos = datosReporte;

    // Filtrar por fechas de culto de la semana
    const fechasCulto = window.obtenerFechasCultoDeSemana();
    console.log('📅 Fechas de culto de la semana:', fechasCulto);

    datos = datos.filter(i => {
        if (!i.fecha) return false;
        const fechaFormato = i.fecha.split('T')[0]; // Convertir 2026-09-13T00:00:00.000Z -> 2026-09-13
        return fechasCulto.includes(fechaFormato);
    });

    console.log('📅 Filtrados por semana de culto:', datos.length, 'registros');

    // Filtrar por estado
    if (estado.value === 'true') {
        datos = datos.filter(i => i.presente);
    } else if (estado.value === 'false') {
        datos = datos.filter(i => !i.presente && !i.justified);
    } else if (estado.value === 'justified') {
        datos = datos.filter(i => i.justified);
    }

    const tb = document.getElementById('tablaDetalleBody');
    if (tb) {
        if (datos.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-light);">No hay datos para esta semana</td></tr>';
            return;
        }

        tb.innerHTML = datos.map(item => `
            <tr>
                <td>${item.nombre} ${item.apellido || ''}</td>
                <td>${item.instrumento || item.voz || '-'}</td>
                <td><strong>${window.obtenerDiaCulto(item.fecha)}</strong></td>
                <td>${item.presente ? '✓' : '-'}</td>
                <td>${!item.presente && !item.justified ? '✓' : '-'}</td>
                <td>${item.justified ? '✓' : '-'}</td>
            </tr>
        `).join('');
    }
};

window.limpiarFiltrosDetalle = function() {
    console.log('🧹 Limpiar filtros');

    const estado = document.getElementById('filtroEstado');

    if (estado) estado.value = '';

    aplicarFiltrosDetalle();
};

// ===== NAVEGACIÓN DE SEMANAS =====
window.calcularSemana = function(fecha) {
    // Calcula lunes-domingo de la semana
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const lunes = new Date(d.setDate(diff));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    return { lunes, domingo };
};

window.formatearRangoSemana = function(semana) {
    const opciones = { month: 'short', day: 'numeric' };
    const lunesStr = semana.lunes.toLocaleDateString('es-ES', opciones);
    const domingoStr = semana.domingo.toLocaleDateString('es-ES', opciones);
    return `${lunesStr} - ${domingoStr}`;
};

window.irASemanaAnterior = function() {
    semanaMostrada.setDate(semanaMostrada.getDate() - 7);
    actualizarVisibleSemana();
};

window.irASemanaProxima = function() {
    semanaMostrada.setDate(semanaMostrada.getDate() + 7);
    actualizarVisibleSemana();
};

window.irAEstaSemana = function() {
    semanaMostrada = new Date();
    actualizarVisibleSemana();
}

window.actualizarVisibleSemana = function() {
    const semana = window.calcularSemana(semanaMostrada);
    const rango = window.formatearRangoSemana(semana);

    const labelEl = document.getElementById('labelSemana');
    const fechasEl = document.getElementById('fechasSemana');

    if (labelEl) labelEl.textContent = 'Semana seleccionada';
    if (fechasEl) fechasEl.textContent = rango;

    console.log('📅 Semana actualizada:', rango);
    aplicarFiltrosDetalle();
};

window.obtenerFechasCultoDeSemana = function() {
    const semana = window.calcularSemana(semanaMostrada);
    const fechas = [];

    for (let i = 0; i < 7; i++) {
        const fecha = new Date(semana.lunes);
        fecha.setDate(semana.lunes.getDate() + i);
        const diaSemana = fecha.getDay();

        // Si es santo_culto, solo días específicos; si es ensayo/bautismo, todos los días
        if (tipoEventoActual === 'santo_culto') {
            if (DIAS_CULTO.includes(diaSemana)) {
                fechas.push(fecha.toISOString().split('T')[0]);
            }
        } else {
            // Todos los días para ensayo y bautismo
            fechas.push(fecha.toISOString().split('T')[0]);
        }
    }

    return fechas;
};

// ===== OBTENER DÍA DEL CULTO =====
window.obtenerDiaCulto = function(fechaStr) {
    if (!fechaStr) return '-';

    const fechaParts = fechaStr.split('T')[0];
    const fecha = new Date(fechaParts);
    const diaSemana = fecha.getDay();

    // 0=domingo, 2=martes, 6=sábado
    const diasCulto = {
        0: 'Domingo',
        2: 'Martes',
        6: 'Sábado'
    };

    const nombreDia = diasCulto[diaSemana] || '-';
    const opciones = { day: 'numeric', month: 'short' };
    const fechaFormato = fecha.toLocaleDateString('es-ES', opciones);

    return `${nombreDia} ${fechaFormato}`;
};

// ===== ACTUALIZAR FILTROS =====