// ===== MINISTERIOS (solo super administrador) =====
// Se crean desde Configuración, para una o varias iglesias. Cada ministerio
// aparece en esa iglesia como un grupo más, junto a Orquesta y Coro.

let ministeriosCargados = [];
let ministerioEnEdicion = null;

async function cargarMinisterios() {
    if (!esSuperadmin) return;
    const tbody = document.getElementById('ministeriosTableBody');
    if (!tbody) return;

    try {
        const r = await fetch(`${API_URL}/ministerios`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudieron cargar');
        ministeriosCargados = await r.json();
        renderizarMinisterios();
    } catch (e) {
        console.error('❌ Error cargando ministerios:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No se pudieron cargar los ministerios</td></tr>';
    }
}

function renderizarMinisterios() {
    const tbody = document.getElementById('ministeriosTableBody');
    if (!tbody) return;

    if (ministeriosCargados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">Todavía no hay ministerios creados</td></tr>';
        return;
    }

    tbody.innerHTML = ministeriosCargados.map(m => `
        <tr>
            <td class="celda-nombre">${escaparHtml(m.nombre)}</td>
            <td class="celda-detalle">${escaparHtml(m.iglesia)}</td>
            <td class="celda-detalle">${m.secciones.length ? m.secciones.map(escaparHtml).join(' · ') : '—'}</td>
            <td class="celda-detalle">${m.integrantes}</td>
            <td class="celda-acciones">
                <button class="btn btn-sm" onclick="abrirModalMinisterio(${m.id})" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminarMinisterio(${m.id})" title="Eliminar ministerio">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        </tr>`).join('');
}

// Sin id es un alta (se eligen las iglesias); con id se edita nombre y subgrupos
function abrirModalMinisterio(id) {
    const modal = document.getElementById('modalMinisterio');
    if (!modal) return;
    ministerioEnEdicion = id ? ministeriosCargados.find(m => m.id === id) : null;
    const m = ministerioEnEdicion;

    document.getElementById('tituloModalMinisterio').textContent = m ? `Editar ministerio · ${m.iglesia}` : 'Nuevo ministerio';
    document.getElementById('ministerioNombre').value = m ? m.nombre : '';
    document.getElementById('ministerioSubgrupos').value = m ? m.secciones.join('\n') : '';
    document.getElementById('bloqueMinisterioIglesias').hidden = !!m;
    document.getElementById('ministerioIglesias').innerHTML = iglesiasCargadas.map(i => `
        <label class="casilla">
            <input type="checkbox" name="ministerioIglesia" value="${i.id}" ${i.id === APP_CONFIG.id ? 'checked' : ''}>
            <span>${escaparHtml(i.nombre)}</span>
        </label>`).join('');
    document.getElementById('btnGuardarMinisterio').disabled = false;

    modal.classList.add('show');
    document.getElementById('ministerioNombre').focus();
}

async function guardarMinisterio(evento) {
    evento.preventDefault();
    const nombre = document.getElementById('ministerioNombre').value.trim();
    // Uno por línea (también se aceptan separados por coma)
    const secciones = document.getElementById('ministerioSubgrupos').value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    const iglesias = [...document.querySelectorAll('input[name="ministerioIglesia"]:checked')].map(i => Number(i.value));

    if (!nombre) return mostrarToast('Indique el nombre del ministerio', 'error');
    if (!ministerioEnEdicion && iglesias.length === 0) return mostrarToast('Seleccione al menos una iglesia', 'error');

    const boton = document.getElementById('btnGuardarMinisterio');
    boton.disabled = true;
    try {
        const r = await fetch(`${API_URL}/ministerios${ministerioEnEdicion ? '/' + ministerioEnEdicion.id : ''}`, {
            method: ministerioEnEdicion ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, secciones, iglesias })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo guardar el ministerio');

        cerrarModal('modalMinisterio');
        mostrarToast(data.omitidos
            ? `Ministerio creado en ${data.creados} iglesia(s). En ${data.omitidos} ya existía.`
            : 'Ministerio guardado', 'success');
        await refrescarTrasCambiarMinisterios();
    } catch (e) {
        mostrarToast(e.message, 'error');
        boton.disabled = false;
    }
}

async function eliminarMinisterio(id) {
    const m = ministeriosCargados.find(x => x.id === id);
    if (!m) return;

    const ok = await confirmar({
        titulo: 'Eliminar ministerio',
        mensaje: m.integrantes > 0
            ? `¿Eliminar ${m.nombre} de ${m.iglesia}?\n\nSe borran sus ${m.integrantes} integrantes y toda su asistencia registrada. Esta acción no se puede deshacer.`
            : `¿Eliminar ${m.nombre} de ${m.iglesia}?`,
        confirmar: 'Eliminar',
        peligroso: true
    });
    if (!ok) return;

    try {
        const r = await fetch(`${API_URL}/ministerios/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            // Solo se confirma el borrado de datos que se mostraron en el aviso
            body: JSON.stringify({ confirmar: m.integrantes > 0 })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            if (r.status === 409) await cargarMinisterios();
            throw new Error(r.status === 409
                ? 'El ministerio ahora tiene integrantes cargados. Revisá la lista y volvé a intentarlo.'
                : data.error || 'No se pudo eliminar');
        }
        mostrarToast('Ministerio eliminado', 'success');
        await refrescarTrasCambiarMinisterios();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

// El menú, las tarjetas y la lista de iglesias dependen de los ministerios
async function refrescarTrasCambiarMinisterios() {
    await cargarConfigApp();
    if (!APP_CONFIG.grupos.some(g => g.id === grupoMiembros)) mostrarGrupoMiembros(APP_CONFIG.grupos[0].id);
    if (!APP_CONFIG.grupos.some(g => g.id === grupoReporte)) cargarReporteGrupo(APP_CONFIG.grupos[0].id);
    cargarConteosMiembros();
    await Promise.all([cargarMinisterios(), cargarIglesias()]);
}

console.log('✅ ministerios.js CARGADO');
