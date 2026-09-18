console.log('✅ reportes.js CARGANDO - VERSIÓN FUNCIONAL');

var grupoReporte = 'orquesta';
var datosReporte = [];
var semanaMostrada = new Date(); // Semana actual por defecto
var tipoEventoActual = 'santo_culto'; // Track current event type

// Días de culto: 2 (martes), 6 (sábado), 0 (domingo)
const DIAS_CULTO = [0, 2, 6];

// ===== CARGAR CONTEOS DEL GRUPO =====
window.cargarReporteGrupo = function(grupo) {
    console.log('🔵 cargarReporteGrupo:', grupo);

    grupoReporte = grupo;

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
        aplicarFiltrosDetalle();
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

// ===== ELIMINAR UN EVENTO COMPLETO =====
window.eliminarEvento = async function(fecha) {
    const nombres = { santo_culto: 'Santo Culto', ensayo: 'Ensayo', bautismo: 'Bautismo' };
    const registros = datosReporte.filter(d => d.fecha && d.fecha.split('T')[0] === fecha).length;
    const [y, m, d] = fecha.split('-');

    const ok = confirm(
        `¿Eliminar el ${nombres[tipoEventoActual] || tipoEventoActual} del ${d}/${m}/${y}?\n\n` +
        `Se borrarán ${registros} registros de asistencia. Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    try {
        const token = localStorage.getItem('token');
        const r = await fetch(`/api/asistencia/evento/${grupoReporte}/${fecha}/${tipoEventoActual}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Error HTTP ${r.status}`);

        mostrarToast(`Evento eliminado (${data.eliminados} registros)`, 'success');
        abrirReporteEvento(tipoEventoActual);
        cargarReporteGrupo(grupoReporte);
    } catch (e) {
        console.error('❌ Error eliminando evento:', e);
        mostrarError('No se pudo eliminar el evento');
    }
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

    const fechasCulto = window.obtenerFechasCultoDeSemana();

    // Las filas son todos los integrantes (el LEFT JOIN los trae aunque no
    // tengan registros); las celdas se llenan con los registros de la semana.
    const integrantes = [];
    const vistos = new Set();
    datosReporte.forEach(d => {
        if (vistos.has(d.id)) return;
        vistos.add(d.id);
        integrantes.push({ id: d.id, nombre: d.nombre, apellido: d.apellido, instrumento: d.instrumento });
    });

    const registrosSemana = datosReporte.filter(i => i.fecha && fechasCulto.includes(i.fecha.split('T')[0]));

    // El filtro por estado sí reduce filas: "mostrame los ausentes"
    let filas = integrantes;
    if (estado.value) {
        const cumple = r =>
            estado.value === 'true'      ? (r.presente && !r.justified) :
            estado.value === 'false'     ? (!r.presente && !r.justified) :
            estado.value === 'justified' ? r.justified : true;
        const idsQueCumplen = new Set(registrosSemana.filter(cumple).map(r => r.id));
        filas = integrantes.filter(m => idsQueCumplen.has(m.id));
    }

    console.log('📅 Semana:', fechasCulto, '| filas:', filas.length, '| registros:', registrosSemana.length);

    const tb = document.getElementById('tablaDetalleBody');
    if (!tb) return;

    if (filas.length === 0) {
        const msg = estado.value ? 'Nadie con ese estado esta semana' : 'No hay integrantes cargados';
        if (window.actualizarHeaderTabla) window.actualizarHeaderTabla();
        tb.innerHTML = `<tr><td colspan="10" class="tabla-vacia">${msg}</td></tr>`;
        return;
    }

    tb.innerHTML = window.generarTablaHorizontal(filas, registrosSemana);
};

window.limpiarFiltrosDetalle = function() {
    console.log('🧹 Limpiar filtros');

    const estado = document.getElementById('filtroEstado');

    if (estado) estado.value = '';

    aplicarFiltrosDetalle();
};

// ===== NAVEGACIÓN DE SEMANAS =====

// "YYYY-MM-DD" en hora local. toISOString() pasa a UTC y de noche
// (Argentina es UTC-3) ya cae en el día siguiente.
window.fechaLocalISO = function(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
};

window.calcularSemana = function(fecha) {
    // Calcula lunes-domingo de la semana. Se fija al mediodía para que
    // ningún cambio de horario mueva el día.
    const d = new Date(fecha);
    d.setHours(12, 0, 0, 0);
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
    console.log('📅 Nueva semana:', semanaMostrada);

    // ACTUALIZAR HEADER Y FILTRO
    if (window.actualizarHeaderTabla) window.actualizarHeaderTabla();
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
                fechas.push(window.fechaLocalISO(fecha));
            }
        } else {
            // Todos los días para ensayo y bautismo
            fechas.push(window.fechaLocalISO(fecha));
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
