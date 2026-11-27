// ===== IGLESIA DEL USUARIO: NOMBRE Y GRUPOS =====
// Al entrar, el servidor dice a qué iglesia pertenece el usuario, qué grupos
// tiene (orquesta, coro o ambos) y cómo se llama la sección de cada uno
// (instrumento / cuerda). Todas las pantallas se arman a partir de esto, así
// con un solo grupo se ve igual que siempre y con dos aparecen los selectores.

var APP_CONFIG = {
    id: null,
    nombre: '',
    grupos: [{ id: 'orquesta', nombre: 'Orquesta', categoria: 'Instrumento', secciones: [] }],
    // Días en que esta iglesia hace culto (0 = domingo … 6 = sábado)
    diasCulto: [0, 2, 6],
    esSuperadmin: false,
    iglesias: []
};

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Promesa de la configuración en curso. Las pantallas la esperan antes de
// pedir datos: si no, arrancan con el default (orquesta) y una iglesia que
// solo tiene coro termina pidiendo un grupo que no existe.
var configLista = null;

function cargarConfigApp() {
    configLista = pedirConfigApp();
    return configLista;
}

async function pedirConfigApp() {
    try {
        const r = await fetch(`${API_URL}/iglesias/actual`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (r.ok) APP_CONFIG = await r.json();
    } catch (e) { /* se sigue con el default */ }
    aplicarConfigEnPantalla();
    return APP_CONFIG;
}

// Qué grupos tiene esta iglesia; hasta saberlo no se piden datos de ninguno
function esperarConfig() {
    return configLista || Promise.resolve(APP_CONFIG);
}

// El super administrador puede pasar a trabajar sobre otra iglesia
async function cambiarIglesia(id) {
    if (!id || Number(id) === APP_CONFIG.id) return;
    try {
        const r = await fetch(`${API_URL}/auth/cambiar-iglesia/${id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'No se pudo cambiar de iglesia');
        localStorage.setItem('token', data.token);
        location.reload();
    } catch (e) {
        mostrarError(e.message);
    }
}

// Para meter texto cargado por usuarios dentro de innerHTML
function escaparHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Iglesia que se está consultando en Reportes cuando no es la propia
// (permiso "ver todas"); null = la del usuario. La define todas-iglesias.js.
var iglesiaConsultada = null;

// Días de culto de la iglesia que se está mirando (puede no ser la propia)
function diasCultoActivos() {
    const dias = iglesiaConsultada ? iglesiaConsultada.diasCulto : APP_CONFIG.diasCulto;
    return Array.isArray(dias) && dias.length ? dias : [0, 2, 6];
}

// Si la iglesia que se está mirando registra bautismos
function registraBautismos() {
    return iglesiaConsultada ? iglesiaConsultada.bautismos === true : APP_CONFIG.bautismos === true;
}

function grupoInfo(id) {
    // Otra iglesia puede tener grupos que la propia no tiene (p. ej. coro)
    const otros = iglesiaConsultada ? iglesiaConsultada.grupos : [];
    return [...APP_CONFIG.grupos, ...otros].find(g => g.id === id) || APP_CONFIG.grupos[0];
}

function hayVariosGrupos(grupos = APP_CONFIG.grupos) {
    return grupos.length > 1;
}

// Orden en que se listan las secciones de un grupo (las desconocidas van al final)
function ordenarSecciones(grupoId, claves) {
    const conocidas = grupoInfo(grupoId).secciones;
    return [
        ...conocidas.filter(s => claves.includes(s)),
        ...claves.filter(k => !conocidas.includes(k)).sort()
    ];
}

// Agrupa integrantes por sección; los que no tienen van a "Sin <categoría>"
function agruparPorSeccion(grupoId, lista) {
    // Un ministerio sin subgrupos es una sola lista
    const info = grupoInfo(grupoId);
    const sinSeccion = info.secciones.length ? `Sin ${info.categoria.toLowerCase()}` : 'Integrantes';
    const g = {};
    lista.forEach(m => {
        const k = m.seccion || sinSeccion;
        (g[k] = g[k] || []).push(m);
    });
    return { grupos: g, orden: ordenarSecciones(grupoId, Object.keys(g)) };
}

const ICONOS_GRUPO = {
    orquesta: '<path d="M18 3a6 6 0 0 0-6 6v12"></path><path d="M6 9a4 4 0 0 0 4 4"></path><circle cx="9" cy="3" r="1.5"></circle>',
    coro: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>'
};

// Los ministerios comparten un ícono de personas
const ICONO_MINISTERIO = '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>';

function esMinisterio(id) {
    return /^m\d+$/.test(id || '');
}

function iconoGrupo(id, tam = 20) {
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${tam > 24 ? 1.5 : 2}">${ICONOS_GRUPO[id] || (esMinisterio(id) ? ICONO_MINISTERIO : ICONOS_GRUPO.orquesta)}</svg>`;
}

// Color de Alabanza si el servidor no mandara el de la iglesia
const COLOR_ALABANZA = '#0284C7';

// Cada grupo trae su color; Orquesta y Coro, el de Alabanza
function marcarColor(elemento, grupo) {
    elemento.classList.add('con-color');
    elemento.style.setProperty('--color-grupo', grupo.color || COLOR_ALABANZA);
}

// Orquesta y Coro forman parte del ministerio de Alabanza. Si además se creó un
// ministerio "Alabanza" con asistencia propia, es el que los encabeza.
function organizarGrupos(grupos = APP_CONFIG.grupos) {
    const musicales = grupos.filter(g => !g.ministerio);
    const propio = musicales.length
        ? grupos.find(g => g.ministerio && g.nombre.trim().toLowerCase() === 'alabanza') || null
        : null;
    return {
        propio,
        musicales,
        alabanza: propio ? [propio, ...musicales] : musicales,
        resto: grupos.filter(g => g.ministerio && g !== propio)
    };
}

// Botonera Orquesta | Coro. Solo se muestra cuando hay más de un grupo.
function renderSelectorGrupo(contenedorId, activo, alCambiar, grupos = APP_CONFIG.grupos) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.hidden = !hayVariosGrupos(grupos);
    cont.innerHTML = '';
    if (!hayVariosGrupos(grupos)) return;
    const { propio, alabanza, resto } = organizarGrupos(grupos);
    const fila = (clase, nombre, botones) => {
        const caja = document.createElement('div');
        caja.className = clase;
        caja.setAttribute('role', 'group');
        caja.setAttribute('aria-label', nombre);
        botones.forEach(b => caja.appendChild(b));
        cont.appendChild(caja);
    };
    const deAlabanza = () => alabanza.map(g =>
        botonGrupo(g, activo, alCambiar, g === propio ? 'Reunión general' : g.nombre));

    const rotulo = document.createElement('span');
    rotulo.className = 'selector-rotulo';
    rotulo.textContent = 'Ministerios';
    cont.appendChild(rotulo);

    // Sin otros ministerios, alcanza con elegir dentro de Alabanza
    if (!resto.length) {
        rotulo.textContent = 'Alabanza';
        fila('selector-botones', 'Alabanza', deAlabanza());
        return;
    }

    // Alabanza es un ministerio más; si está elegido, abajo se elige Orquesta o Coro
    const enAlabanza = alabanza.some(g => g.id === activo);
    const principales = resto.map(g => botonGrupo(g, activo, alCambiar));
    if (alabanza.length) {
        const boton = botonGrupo(propio || { id: alabanza[0].id, color: alabanza[0].color }, enAlabanza ? (propio || alabanza[0]).id : activo, alCambiar, 'Alabanza');
        principales.unshift(boton);
    }
    fila('selector-botones', 'Ministerios', principales);
    if (enAlabanza && alabanza.length > 1) fila('selector-botones selector-sub', 'Alabanza', deAlabanza());
}

function botonGrupo(g, activo, alCambiar, texto = g.nombre) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'selector-grupo-btn' + (g.id === activo ? ' activo' : '');
    b.textContent = texto;
    marcarColor(b, g);
    b.addEventListener('click', () => {
        if (g.id === activo) return;
        alCambiar(g.id);
    });
    return b;
}

// ===== MENÚ LATERAL: ÍTEMS QUE SE DESPLIEGAN =====
// Lo que se dejó abierto sigue abierto aunque el menú se vuelva a armar
const menuAbiertos = new Set();

function itemDesplegable(clave, nombre, icono, hijos) {
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'menu-desplegar';
    boton.innerHTML = `${icono}<span>${escaparHtml(nombre)}</span>
        <svg class="menu-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"></polyline></svg>`;
    const lista = document.createElement('ul');
    lista.className = 'menu-hijos';
    hijos.forEach(h => lista.appendChild(h));

    const mostrar = abierto => {
        lista.hidden = !abierto;
        boton.setAttribute('aria-expanded', String(abierto));
    };
    mostrar(menuAbiertos.has(clave));
    boton.addEventListener('click', () => {
        const abrir = lista.hidden;
        if (abrir) menuAbiertos.add(clave); else menuAbiertos.delete(clave);
        mostrar(abrir);
    });

    li.append(boton, lista);
    return li;
}

// Las dos cosas que se pueden hacer con un grupo
function accionesDeGrupo(g) {
    const accion = (texto, alTocar, datos = {}) => {
        const li = document.createElement('li');
        const item = document.createElement('div');
        item.className = 'sidebar-menu-item menu-accion';
        item.innerHTML = `<span>${texto}</span>`;
        Object.assign(item.dataset, datos);
        item.addEventListener('click', alTocar);
        li.appendChild(item);
        return li;
    };
    return [
        accion('Registrar asistencia', () => irAAsistencia(g.id)),
        accion('Integrantes', () => cambiarTab('miembros', g.id), { tab: 'miembros', grupo: g.id })
    ];
}

function itemDeGrupo(g) {
    const li = itemDesplegable(g.id, g.nombre, iconoGrupo(g.id), accionesDeGrupo(g));
    li.dataset.grupo = g.id;
    marcarColor(li, g);
    return li;
}

// Nombre de la iglesia, ítems del menú y tarjetas de Inicio
function aplicarConfigEnPantalla() {
    const nombre = APP_CONFIG.nombre || APP_CONFIG.grupos.map(g => g.nombre).join(' y ');
    const set = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
    set('marcaNombre', nombre);
    document.title = `Asistencia · ${nombre}`;

    // Bautismos: solo en las iglesias que los registran
    const opcionBautismo = document.getElementById('opcionBautismo');
    if (opcionBautismo) opcionBautismo.hidden = !APP_CONFIG.bautismos;

    // Panel de todas las iglesias: solo con el permiso correspondiente
    const menuTodas = document.getElementById('menuTodasIglesias');
    if (menuTodas) menuTodas.hidden = !APP_CONFIG.verTodas;

    // Super administrador: selector de iglesia en la barra superior
    const selector = document.getElementById('selectorIglesia');
    if (selector) {
        const lista = APP_CONFIG.iglesias || [];
        selector.hidden = !(APP_CONFIG.esSuperadmin && lista.length > 0);
        selector.innerHTML = lista.map(i =>
            `<option value="${i.id}" ${i.id === APP_CONFIG.id ? 'selected' : ''}>${escaparHtml(i.nombre)}${i.activa === false ? ' (baja)' : ''}</option>`
        ).join('');
    }

    const ARTICULO = { orquesta: 'la', coro: 'el' };
    // Con ministerios la enumeración se hace larga: se habla de la iglesia
    const listaGrupos = APP_CONFIG.grupos.some(g => g.ministerio)
        ? 'la iglesia'
        : APP_CONFIG.grupos.map(g => `${ARTICULO[g.id] || 'el'} ${g.nombre.toLowerCase()}`).join(' y ');
    set('inicioSubtitulo', `Resumen de la actividad de ${listaGrupos}`);
    set('statIntegrantesHint', `activos en ${listaGrupos}`);

    // Menú lateral: un ítem por grupo, antes de Reportes
    const fin = document.getElementById('menuGruposFin');
    if (fin) {
        document.querySelectorAll('.sidebar-menu > li[data-grupo]').forEach(li => li.remove());
        const agregar = (grupo, contenido, clase) => {
            const li = document.createElement('li');
            li.dataset.grupo = grupo; // la marca para rearmar el menú
            if (clase) li.className = clase;
            li.innerHTML = contenido;
            fin.before(li);
            return li;
        };

        agregar('', 'Ministerios', 'menu-titulo');

        // Alabanza va primero; al abrirlo aparecen Orquesta y Coro
        const { propio, musicales, resto } = organizarGrupos();
        if (musicales.length) {
            const rama = itemDesplegable('alabanza', propio ? propio.nombre : 'Alabanza',
                `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONO_MINISTERIO}</svg>`,
                [...(propio ? accionesDeGrupo(propio) : []), ...musicales.map(itemDeGrupo)]);
            rama.dataset.grupo = '';
            marcarColor(rama, propio || musicales[0]);
            fin.before(rama);
        }
        resto.forEach(g => fin.before(itemDeGrupo(g)));
        if (typeof cerrarSidebarAlHacerClick === 'function') cerrarSidebarAlHacerClick();
    }

    // Tarjetas de Inicio para registrar asistencia
    const tarjetas = document.getElementById('tarjetasGrupos');
    if (tarjetas) {
        // Una tarjeta por ministerio, todas iguales: adentro va un botón por cada
        // asistencia que se puede tomar
        const { propio, alabanza, resto } = organizarGrupos();
        const tarjeta = (nombre, color, opciones) => `
            <div class="card-grupo card-ministerio ${color ? 'con-color' : ''}" ${color ? `style="--color-grupo: ${color}"` : ''}>
                <div class="card-grupo-cabecera">
                    <div class="card-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${ICONO_MINISTERIO}</svg></div>
                    <div>
                        <h3>${escaparHtml(nombre)}</h3>
                        <p class="card-count">Registrar asistencia</p>
                    </div>
                </div>
                <div class="card-opciones">
                    ${opciones.map(({ grupo, texto, icono }) => `
                        <button type="button" class="btn btn-primary card-accion" onclick="irAAsistencia('${grupo}'); return false;">
                            ${icono}
                            <span class="opcion-nombre">${escaparHtml(texto)}</span>
                            <span class="opcion-conteo" id="conteo-${grupo}">— integrantes</span>
                        </button>`).join('')}
                </div>
            </div>`;
        const ICONO_REUNION = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>';
        // Los ministerios toman asistencia en reuniones
        const reunion = (g, texto = 'Reunión') => ({ grupo: g.id, texto, icono: ICONO_REUNION });

        const deAlabanza = alabanza.map(g => g === propio
            ? reunion(g, 'Reunión general')
            : { grupo: g.id, texto: g.nombre, icono: iconoGrupo(g.id, 18) });
        tarjetas.innerHTML = '<h4 class="cards-titulo">Ministerios</h4>'
            + (alabanza.length ? tarjeta(propio ? propio.nombre : 'Alabanza', (propio || alabanza[0])?.color, deAlabanza) : '')
            + resto.map(g => tarjeta(g.nombre, g.color, [reunion(g)])).join('');
    }
}
