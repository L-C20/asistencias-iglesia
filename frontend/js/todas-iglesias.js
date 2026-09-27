// ===== PANEL "TODAS LAS IGLESIAS" =====
// Para quienes tienen el permiso de ver la asistencia de las demás iglesias.
// Es solo lectura: se consultan los reportes, no se puede cargar ni editar nada.

let iglesiasResumen = [];

async function cargarTodasIglesias() {
    const tbody = document.getElementById('tablaIglesiasBody');
    if (!tbody) return;

    try {
        const r = await fetch(`${API_URL}/reportes/iglesias`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!r.ok) throw new Error('No se pudo cargar');
        iglesiasResumen = await r.json();
        renderizarPanelTotales();
        renderizarPanelIglesias();
    } catch (e) {
        console.error('❌ Error cargando iglesias:', e);
        tbody.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No se pudieron cargar las iglesias</td></tr>';
    }
}

// Tarjetas con el total de todas las iglesias juntas
function renderizarPanelTotales() {
    const cont = document.getElementById('totalesIglesias');
    if (!cont) return;

    const activas = iglesiasResumen.filter(i => i.activa);
    const integrantes = iglesiasResumen.reduce((s, i) => s + i.integrantes, 0);
    const eventos = iglesiasResumen.reduce((s, i) => s + i.eventos, 0);
    const conPromedio = iglesiasResumen.filter(i => i.asistencia_promedio !== null);
    const promedio = conPromedio.length
        ? Math.round(conPromedio.reduce((s, i) => s + i.asistencia_promedio, 0) / conPromedio.length)
        : null;

    const tarjeta = (etiqueta, valor, pista) => `
        <div class="stat-card">
            <div class="stat-label">${etiqueta}</div>
            <div class="stat-value">${valor}</div>
            <div class="stat-hint">${pista}</div>
        </div>`;

    cont.innerHTML =
        tarjeta('Iglesias', iglesiasResumen.length, `${activas.length} activas`) +
        tarjeta('Integrantes', integrantes, 'en todas las iglesias') +
        tarjeta('Eventos registrados', eventos, 'cultos, ensayos y bautismos') +
        tarjeta('Presentismo', promedio === null ? '—' : `${promedio}%`, 'promedio entre iglesias');
}

function renderizarPanelIglesias() {
    const tbody = document.getElementById('tablaIglesiasBody');
    if (!tbody) return;

    if (iglesiasResumen.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay iglesias cargadas</td></tr>';
        return;
    }

    tbody.innerHTML = iglesiasResumen.map(i => {
        const fecha = i.ultima_fecha
            ? new Date(i.ultima_fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            : '—';
        return `
        <tr class="${i.activa ? '' : 'fila-inactiva'}">
            <td class="celda-nombre">
                ${escaparHtml(i.nombre)}
                ${i.id === APP_CONFIG.id ? '<span class="badge badge-admin">Tu iglesia</span>' : ''}
                ${i.activa ? '' : '<span class="badge badge-danger">baja</span>'}
            </td>
            <td class="celda-detalle">${escaparHtml(i.departamento) || '—'}</td>
            <td class="celda-detalle">${i.grupos.map(g => `<span class="badge badge-grupo">${g.nombre}</span>`).join('')}</td>
            <td class="celda-detalle">${i.integrantes}</td>
            <td class="celda-detalle">${i.eventos}</td>
            <td class="celda-detalle">${fecha}</td>
            <td class="celda-detalle">${i.asistencia_promedio === null ? '—' : i.asistencia_promedio + '%'}</td>
            <td class="celda-reportes">
                <div class="botones-reportes">
                    ${i.grupos.map(g => `
                        <button class="btn-ver-reporte" onclick="verReportesDe(${i.id}, '${g.id}')">
                            <span>${g.nombre}</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>`).join('')}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Abre Reportes apuntando a otra iglesia (solo lectura)
function verReportesDe(iglesiaId, grupo) {
    const iglesia = iglesiasResumen.find(i => i.id === iglesiaId);
    if (!iglesia) return;

    cambiarTab('reportes');
    // null = la propia; con valor, las consultas de reportes llevan ?iglesia_id=
    iglesiaConsultada = iglesiaId === APP_CONFIG.id ? null : { id: iglesiaId, nombre: iglesia.nombre, grupos: iglesia.grupos };
    volverATarjetas();
    cargarReporteGrupo(grupo);
}

// Reportes de la iglesia propia (menú lateral y enlace del aviso)
function irAReportesPropios() {
    const veniaDeOtra = !!iglesiaConsultada;
    iglesiaConsultada = null;
    cambiarTab('reportes');
    if (veniaDeOtra) {
        volverATarjetas();
        cargarReporteGrupo(APP_CONFIG.grupos[0].id);
    }
}

const volverAMiIglesia = irAReportesPropios;

console.log('✅ todas-iglesias.js CARGADO');
