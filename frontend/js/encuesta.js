// ===== FORMULARIO PÚBLICO DE ALTA DE IGLESIA =====
// Se abre con /encuesta/<codigo>. No hay sesión ni datos de nadie: solo se
// manda una solicitud que después el super administrador aprueba o descarta.

const TOKEN_ENCUESTA = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');

const el = id => document.getElementById(id);

function mostrarCerrada(mensaje) {
    el('encuestaCargando').hidden = true;
    el('encuestaForm').hidden = true;
    const aviso = el('encuestaCerrada');
    aviso.textContent = mensaje;
    aviso.hidden = false;
}

function mostrarError(mensaje) {
    const caja = el('encuestaError');
    caja.textContent = mensaje;
    caja.style.display = 'block';
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function abrirFormulario() {
    try {
        const r = await fetch(`/api/solicitudes/formulario/${encodeURIComponent(TOKEN_ENCUESTA)}`);
        const datos = await r.json().catch(() => ({}));

        if (!r.ok) {
            return mostrarCerrada(datos.completado
                ? 'Este formulario ya fue completado. Si necesitás corregir algo, pedí un enlace nuevo.'
                : 'Este enlace no es válido. Pedí uno nuevo a quien te lo envió.');
        }

        if (datos.etiqueta) el('encuestaPara').textContent = datos.etiqueta;

        el('encuestaGrupos').innerHTML = datos.grupos.map(g => `
            <label class="casilla">
                <input type="checkbox" name="grupo" value="${g.id}"> <span>${g.nombre}</span>
            </label>`).join('');

        el('encuestaDias').innerHTML = datos.dias.map(d => `
            <label class="casilla casilla-dia">
                <input type="checkbox" name="dia" value="${d.valor}"> <span>${d.nombre}</span>
            </label>`).join('');

        el('encuestaCargando').hidden = true;
        el('encuestaForm').hidden = false;
    } catch (e) {
        mostrarCerrada('No pudimos abrir el formulario. Probá de nuevo en un rato.');
    }
}

function marcados(nombre) {
    return [...document.querySelectorAll(`input[name="${nombre}"]:checked`)].map(i => i.value);
}

let enviando = false;

async function enviarEncuesta(evento) {
    evento.preventDefault();
    if (enviando) return;

    const datos = {
        solicitante: el('solicitante').value.trim(),
        dni: el('dni').value.trim(),
        telefono: el('telefono').value.trim(),
        iglesia_nombre: el('iglesiaNombre').value.trim(),
        departamento: el('departamento').value.trim(),
        anciano: el('anciano').value.trim(),
        grupos: marcados('grupo'),
        dias_culto: marcados('dia'),
        comentarios: el('comentarios').value.trim()
    };

    if (!datos.solicitante) return mostrarError('Poné tu nombre y apellido');
    if (!datos.iglesia_nombre) return mostrarError('Poné el nombre de la iglesia');
    if (datos.grupos.length === 0) return mostrarError('Marcá si tienen orquesta, coro o ambas');
    if (datos.dias_culto.length === 0) return mostrarError('Marcá los días en que hacen culto');

    const boton = el('encuestaEnviar');
    enviando = true;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Enviando…';

    try {
        const r = await fetch(`/api/solicitudes/formulario/${encodeURIComponent(TOKEN_ENCUESTA)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const respuesta = await r.json().catch(() => ({}));

        if (!r.ok) throw new Error(respuesta.error || 'No se pudo enviar');

        el('encuestaForm').hidden = true;
        el('encuestaGracias').hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        mostrarError(e.message);
        boton.disabled = false;
        boton.textContent = 'Enviar';
    } finally {
        enviando = false;
    }
}

document.getElementById('encuestaForm').addEventListener('submit', enviarEncuesta);
abrirFormulario();
