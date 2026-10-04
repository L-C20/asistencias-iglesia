// ===== INSCRIPCIONES DE INTEGRANTES (administradores) =====
// Quien abre el enlace de la iglesia queda acá como pendiente; el encargado lo
// aprueba (pasa a la planilla) o lo rechaza.

let inscripcionesPendientes = [];
let tokenInscripcion = null;

function enlaceDeInscripcion(token) {
    return `${location.origin}/unirse/${token}`;
}

async function cargarInscripciones() {
    const seccion = document.getElementById('seccionInscripciones');
    if (!seccion) return;
    seccion.hidden = !esAdmin;
    if (!esAdmin) return;

    try {
        const r = await fetch(`${API_URL}/inscripciones`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudieron cargar');
        const datos = await r.json();
        inscripcionesPendientes = datos.pendientes;
        tokenInscripcion = datos.token;
        renderizarInscripciones();
    } catch (e) {
        console.error('❌ Error cargando inscripciones:', e);
    }
}

function renderizarInscripciones() {
    const tabla = document.getElementById('tablaInscripciones');
    const tbody = document.getElementById('inscripcionesTableBody');
    const contador = document.getElementById('contadorInscripciones');
    const ayuda = document.getElementById('ayudaInscripciones');
    const copiar = document.getElementById('btnCopiarEnlaceInscripcion');

    copiar.hidden = !tokenInscripcion;
    contador.hidden = inscripcionesPendientes.length === 0;
    contador.textContent = `${inscripcionesPendientes.length} pendiente${inscripcionesPendientes.length === 1 ? '' : 's'}`;
    tabla.hidden = inscripcionesPendientes.length === 0;

    if (!tokenInscripcion) {
        ayuda.textContent = 'La inscripción por enlace no está habilitada para esta iglesia. Solicítela al super administrador.';
    } else if (inscripcionesPendientes.length === 0) {
        ayuda.textContent = 'Comparta el enlace con los integrantes. Sus inscripciones aparecerán aquí para su aprobación.';
    } else {
        ayuda.textContent = 'Al aprobar una inscripción, el integrante se incorpora a la planilla de asistencia.';
    }

    tbody.innerHTML = inscripcionesPendientes.map(i => `
        <tr>
            <td class="celda-nombre">${escaparHtml(i.nombre)}</td>
            <td class="celda-detalle"><span class="badge badge-grupo">${i.grupo === 'coro' ? 'Coro' : 'Orquesta'}</span></td>
            <td class="celda-detalle">${escaparHtml(i.seccion) || '—'}</td>
            <td class="celda-acciones">
                <button class="btn btn-sm btn-primary" onclick="aprobarInscripcion(${i.id})" title="Aprobar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="btn btn-sm btn-danger" onclick="rechazarInscripcion(${i.id})" title="Rechazar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </td>
        </tr>`).join('');
}

function copiarEnlaceInscripcion() {
    if (tokenInscripcion) copiar(enlaceDeInscripcion(tokenInscripcion));
}

async function resolverInscripcion(id, metodo, ruta, exito) {
    try {
        const r = await fetch(`${API_URL}/inscripciones/${id}${ruta}`, {
            method: metodo,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo completar la acción');
        mostrarToast(exito, 'success');
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
    cargarInscripciones();
}

function aprobarInscripcion(id) {
    resolverInscripcion(id, 'POST', '/aprobar', 'Integrante incorporado a la planilla');
}

function rechazarInscripcion(id) {
    const i = inscripcionesPendientes.find(x => x.id === id);
    if (!i || !confirm(`¿Rechazar la inscripción de ${i.nombre}?`)) return;
    resolverInscripcion(id, 'DELETE', '', 'Inscripción rechazada');
}

// ---------- Enlace de cada iglesia (super administrador) ----------

async function generarEnlaceInscripcion(iglesiaId) {
    const iglesia = iglesiasCargadas.find(i => i.id === iglesiaId);
    if (!iglesia) return;
    if (iglesia.enlaceInscripcion &&
        !confirm(`Se generará un enlace nuevo para ${iglesia.nombre} y el anterior dejará de funcionar. ¿Continuar?`)) return;

    try {
        const r = await fetch(`${API_URL}/iglesias/${iglesiaId}/enlace-inscripcion`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo generar el enlace');
        await cargarIglesias();
        copiar(enlaceDeInscripcion(data.token));
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

function copiarEnlaceDeIglesia(iglesiaId) {
    const iglesia = iglesiasCargadas.find(i => i.id === iglesiaId);
    if (iglesia && iglesia.enlaceInscripcion) copiar(enlaceDeInscripcion(iglesia.enlaceInscripcion));
}

async function desactivarEnlaceInscripcion(iglesiaId) {
    const iglesia = iglesiasCargadas.find(i => i.id === iglesiaId);
    if (!iglesia || !confirm(`¿Desactivar el enlace de inscripción de ${iglesia.nombre}? Dejará de funcionar.`)) return;

    try {
        const r = await fetch(`${API_URL}/iglesias/${iglesiaId}/enlace-inscripcion`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudo desactivar el enlace');
        mostrarToast('Enlace desactivado', 'success');
        cargarIglesias();
    } catch (e) {
        mostrarToast(e.message, 'error');
    }
}

console.log('✅ inscripciones.js CARGADO');
