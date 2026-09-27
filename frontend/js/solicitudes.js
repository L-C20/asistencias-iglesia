// ===== SOLICITUDES DE ALTA DE IGLESIA (solo super administrador) =====
// El enlace se genera acá, lo completa el encargado en /encuesta/<codigo> y la
// respuesta vuelve a esta pantalla para aprobarla o descartarla.

let solicitudesCargadas = [];
let solicitudAbierta = null;
// Solicitud que originó la iglesia que se está creando, para marcarla al guardar
let solicitudDeAlta = null;

const ETIQUETA_ESTADO = {
    pendiente:  { texto: 'Pendiente de respuesta', clase: 'badge-operario' },
    respondida: { texto: 'Pendiente de revisión',  clase: 'badge-admin' },
    aprobada:   { texto: 'Aprobada',               clase: 'badge-success' },
    descartada: { texto: 'Rechazada',              clase: 'badge-danger' }
};

function enlaceDeSolicitud(token) {
    return `${location.origin}/alta/${token}`;
}

async function cargarSolicitudes() {
    if (!esSuperadmin) return;
    const tbody = document.getElementById('solicitudesTableBody');
    if (!tbody) return;

    try {
        const r = await fetch(`${API_URL}/solicitudes`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudieron cargar');
        solicitudesCargadas = await r.json();
        renderizarSolicitudes();
    } catch (e) {
        console.error('❌ Error cargando solicitudes:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No se pudieron cargar las solicitudes</td></tr>';
    }
}

function renderizarSolicitudes() {
    const tbody = document.getElementById('solicitudesTableBody');
    if (!tbody) return;

    if (solicitudesCargadas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No hay solicitudes registradas</td></tr>';
        return;
    }

    tbody.innerHTML = solicitudesCargadas.map(s => {
        const estado = ETIQUETA_ESTADO[s.estado] || ETIQUETA_ESTADO.pendiente;
        const pendiente = s.estado === 'pendiente';
        return `
        <tr>
            <td class="celda-nombre">${escaparHtml(s.etiqueta)}</td>
            <td class="celda-detalle"><span class="badge ${estado.clase}">${estado.texto}</span></td>
            <td class="celda-detalle">${escaparHtml(s.iglesia_nombre) || '—'}</td>
            <td class="celda-detalle">${escaparHtml(s.solicitante) || '—'}</td>
            <td class="celda-acciones">
                ${pendiente ? `
                <button class="btn btn-sm" onclick="copiarEnlaceDe(${s.id})" title="Copiar enlace">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>` : `
                <button class="btn btn-sm" onclick="abrirSolicitud(${s.id})" title="Ver solicitud">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                </button>`}
                <button class="btn btn-sm btn-danger" onclick="eliminarSolicitud(${s.id})" title="${pendiente ? 'Anular enlace' : 'Eliminar solicitud'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ---------- Generar el enlace ----------

function abrirModalEnlace() {
    const modal = document.getElementById('modalEnlace');
    if (!modal) return;
    document.getElementById('enlaceEtiqueta').value = '';
    document.getElementById('bloqueEtiquetaEnlace').hidden = false;
    document.getElementById('bloqueEnlaceListo').hidden = true;
    document.getElementById('btnGenerarEnlace').hidden = false;
    document.getElementById('btnGenerarEnlace').disabled = false;
    modal.classList.add('show');
    document.getElementById('enlaceEtiqueta').focus();
}

async function generarEnlace(e) {
    e.preventDefault();
    const etiqueta = document.getElementById('enlaceEtiqueta').value.trim();
    if (!etiqueta) return mostrarToast('Indique el destinatario del enlace', 'error');

    const boton = document.getElementById('btnGenerarEnlace');
    boton.disabled = true;
    try {
        const r = await fetch(`${API_URL}/solicitudes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ etiqueta })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo generar el enlace');

        document.getElementById('enlaceGenerado').value = enlaceDeSolicitud(data.token);
        document.getElementById('bloqueEtiquetaEnlace').hidden = true;
        document.getElementById('bloqueEnlaceListo').hidden = false;
        boton.hidden = true;
        cargarSolicitudes();
    } catch (error) {
        mostrarToast(error.message, 'error');
        boton.disabled = false;
    }
}

async function copiar(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        mostrarToast('Enlace copiado', 'success');
    } catch (e) {
        mostrarToast('No se pudo copiar automáticamente. El enlace es: ' + texto, 'info');
    }
}

function copiarEnlace() {
    copiar(document.getElementById('enlaceGenerado').value);
}

function copiarEnlaceDe(id) {
    const s = solicitudesCargadas.find(x => x.id === id);
    if (s) copiar(enlaceDeSolicitud(s.token));
}

// ---------- Revisar una respuesta ----------

function abrirSolicitud(id) {
    const s = solicitudesCargadas.find(x => x.id === id);
    if (!s) return;
    solicitudAbierta = s;

    const dato = (etiqueta, valor) => `
        <div class="dato-solicitud">
            <span class="dato-etiqueta">${etiqueta}</span>
            <span class="dato-valor">${escaparHtml(valor) || '—'}</span>
        </div>`;

    const grupos = s.grupos.map(g => g === 'coro' ? 'Coro' : 'Orquesta').join(' y ');
    const dias = s.dias_culto.map(d => NOMBRES_DIA[d]).join(' · ');
    const resuelta = s.estado === 'aprobada' || s.estado === 'descartada';

    document.getElementById('detalleSolicitud').innerHTML =
        `<p class="subtitulo-bloque" style="border: 0; padding-top: 0; margin-top: 0;">Datos del solicitante</p>` +
        dato('Nombre y apellido', s.solicitante) +
        dato('Documento de identidad', s.dni) +
        dato('Teléfono de contacto', s.telefono) +
        `<p class="subtitulo-bloque">Datos de la iglesia</p>` +
        dato('Nombre', s.iglesia_nombre) +
        dato('Departamento', s.departamento) +
        dato('Anciano que autoriza', s.anciano) +
        dato('Grupos que participan', grupos) +
        dato('Días de culto', dias) +
        (s.comentarios ? `<p class="subtitulo-bloque">Observaciones</p><p class="ayuda-campo">${escaparHtml(s.comentarios)}</p>` : '') +
        (s.estado === 'aprobada'
            ? `<p class="aviso-inline">La iglesia <b>${escaparHtml(s.iglesia_creada || s.iglesia_nombre)}</b> fue dada de alta con estos datos.</p>`
            : '') +
        (s.estado === 'descartada' ? '<p class="aviso-inline">Esta solicitud fue rechazada.</p>' : '');

    // Una solicitud ya resuelta solo se mira
    document.querySelectorAll('#modalSolicitud .modal-footer .btn').forEach(b => { b.hidden = resuelta; });
    document.getElementById('modalSolicitud').classList.add('show');
}

// Abre el formulario de iglesia con los datos de la solicitud ya cargados
function crearIglesiaDesdeSolicitud() {
    if (!solicitudAbierta) return;
    const s = solicitudAbierta;

    cerrarModal('modalSolicitud');
    abrirModalIglesia();

    document.getElementById('iglesiaNombre').value = s.iglesia_nombre;
    document.getElementById('iglesiaDepartamento').value = s.departamento;
    document.getElementById('iglesiaAnciano').value = s.anciano;
    document.getElementById('iglesiaGrupoOrquesta').checked = s.grupos.includes('orquesta');
    document.getElementById('iglesiaGrupoCoro').checked = s.grupos.includes('coro');
    renderDiasCulto(s.dias_culto);

    // guardarIglesia() marca la solicitud cuando la creación sale bien
    solicitudDeAlta = s.id;
}

// Marca en qué terminó la solicitud; la llama guardarIglesia()
async function resolverSolicitud(id, estado, iglesiaId) {
    try {
        await fetch(`${API_URL}/solicitudes/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado, iglesia_id: iglesiaId })
        });
        cargarSolicitudes();
    } catch (e) {
        console.error('❌ Error resolviendo solicitud:', e);
    }
}

async function descartarSolicitud() {
    if (!solicitudAbierta) return;
    if (!confirm(`¿Rechazar la solicitud de ${solicitudAbierta.iglesia_nombre}?`)) return;
    await resolverSolicitud(solicitudAbierta.id, 'descartada');
    cerrarModal('modalSolicitud');
    mostrarToast('Solicitud rechazada', 'success');
}

async function eliminarSolicitud(id) {
    const s = solicitudesCargadas.find(x => x.id === id);
    if (!s) return;
    const aviso = s.estado === 'pendiente'
        ? `¿Anular el enlace de ${s.etiqueta}? Dejará de estar disponible.`
        : `¿Eliminar la solicitud de ${s.etiqueta}?`;
    if (!confirm(aviso)) return;

    try {
        const r = await fetch(`${API_URL}/solicitudes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudo eliminar');
        mostrarToast(s.estado === 'pendiente' ? 'Enlace anulado' : 'Solicitud eliminada', 'success');
        cargarSolicitudes();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

console.log('✅ solicitudes.js CARGADO');
