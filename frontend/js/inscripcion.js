// ===== FORMULARIO PÚBLICO DE INSCRIPCIÓN DE INTEGRANTES =====
// Se abre con /unirse/<codigo>. No hay sesión: la inscripción queda pendiente
// hasta que el encargado de la iglesia la aprueba.

const TOKEN_INSCRIPCION = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');

const el = id => document.getElementById(id);
let gruposIglesia = [];

function mostrarCerrada(mensaje) {
    el('inscripcionCargando').hidden = true;
    el('inscripcionForm').hidden = true;
    const aviso = el('inscripcionCerrada');
    aviso.textContent = mensaje;
    aviso.hidden = false;
}

function mostrarError(mensaje) {
    const caja = el('inscripcionError');
    caja.textContent = mensaje;
    caja.style.display = 'block';
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function grupoElegido() {
    const marcado = document.querySelector('input[name="grupo"]:checked');
    return gruposIglesia.find(g => g.id === (marcado && marcado.value));
}

// Las opciones de sección dependen del grupo (instrumentos o cuerdas)
function cargarSecciones() {
    const grupo = grupoElegido();
    if (!grupo) return;
    el('etiquetaSeccion').textContent = grupo.categoria;
    el('inscripcionSeccion').innerHTML =
        `<option value="">Seleccione…</option>` +
        grupo.secciones.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function abrirFormulario() {
    try {
        const r = await fetch(`/api/inscripciones/formulario/${encodeURIComponent(TOKEN_INSCRIPCION)}`);
        const datos = await r.json().catch(() => ({}));
        if (!r.ok) {
            return mostrarCerrada('Este enlace no es válido o fue dado de baja. Solicite uno nuevo al encargado de su iglesia.');
        }

        gruposIglesia = datos.grupos;
        el('inscripcionIglesia').textContent = datos.iglesia;
        el('inscripcionIglesia').hidden = false;

        // Con un solo grupo no hay nada que elegir
        el('bloqueGrupo').hidden = gruposIglesia.length === 1;
        el('inscripcionGrupos').innerHTML = gruposIglesia.map((g, i) => `
            <label class="casilla">
                <input type="radio" name="grupo" value="${g.id}" ${i === 0 ? 'checked' : ''}> <span>${g.nombre}</span>
            </label>`).join('');
        el('inscripcionGrupos').addEventListener('change', cargarSecciones);
        cargarSecciones();

        el('inscripcionCargando').hidden = true;
        el('inscripcionForm').hidden = false;
    } catch (e) {
        mostrarCerrada('No fue posible abrir el formulario. Vuelva a intentarlo en unos minutos.');
    }
}

let enviando = false;

async function enviarInscripcion(evento) {
    evento.preventDefault();
    if (enviando) return;

    const grupo = grupoElegido();
    const datos = {
        nombre: el('inscripcionNombre').value.trim(),
        grupo: grupo && grupo.id,
        seccion: el('inscripcionSeccion').value
    };

    if (datos.nombre.split(/\s+/).length < 2) return mostrarError('Indique su nombre y apellido');
    if (!datos.seccion) return mostrarError(`Seleccione su ${grupo.categoria.toLowerCase()}`);

    const boton = el('inscripcionEnviar');
    enviando = true;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Enviando…';

    try {
        const r = await fetch(`/api/inscripciones/formulario/${encodeURIComponent(TOKEN_INSCRIPCION)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const respuesta = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(respuesta.error || 'No fue posible enviar la inscripción');

        el('inscripcionForm').hidden = true;
        el('inscripcionGracias').hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        mostrarError(e.message);
        boton.disabled = false;
        boton.textContent = 'Enviar inscripción';
    } finally {
        enviando = false;
    }
}

el('inscripcionForm').addEventListener('submit', enviarInscripcion);
abrirFormulario();
