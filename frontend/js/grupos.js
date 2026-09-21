// ===== CONFIGURACIÓN DE LA INSTALACIÓN: NOMBRE Y GRUPOS =====
// El servidor dice qué grupos tiene esta iglesia (orquesta, coro o ambos) y
// cómo se llama la sección de cada uno (instrumento / cuerda). Todas las
// pantallas se arman a partir de esto, así con un solo grupo se ve igual que
// siempre y con dos aparecen los selectores.

var APP_CONFIG = {
    nombre: '',
    grupos: [{ id: 'orquesta', nombre: 'Orquesta', categoria: 'Instrumento', secciones: [] }]
};

async function cargarConfigApp() {
    try {
        const r = await fetch('/api/config');
        if (r.ok) APP_CONFIG = await r.json();
    } catch (e) { /* se sigue con el default */ }
    aplicarConfigEnPantalla();
    return APP_CONFIG;
}

function grupoInfo(id) {
    return APP_CONFIG.grupos.find(g => g.id === id) || APP_CONFIG.grupos[0];
}

function hayVariosGrupos() {
    return APP_CONFIG.grupos.length > 1;
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
    const sinSeccion = `Sin ${grupoInfo(grupoId).categoria.toLowerCase()}`;
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

function iconoGrupo(id, tam = 20) {
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${tam > 24 ? 1.5 : 2}">${ICONOS_GRUPO[id] || ICONOS_GRUPO.orquesta}</svg>`;
}

// Botonera Orquesta | Coro. Solo se muestra cuando hay más de un grupo.
function renderSelectorGrupo(contenedorId, activo, alCambiar) {
    const cont = document.getElementById(contenedorId);
    if (!cont) return;
    cont.hidden = !hayVariosGrupos();
    cont.innerHTML = '';
    if (!hayVariosGrupos()) return;
    APP_CONFIG.grupos.forEach(g => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'selector-grupo-btn' + (g.id === activo ? ' activo' : '');
        b.textContent = g.nombre;
        b.addEventListener('click', () => {
            if (g.id === activo) return;
            alCambiar(g.id);
        });
        cont.appendChild(b);
    });
}

// Nombre de la iglesia, ítems del menú y tarjetas de Inicio
function aplicarConfigEnPantalla() {
    const nombre = APP_CONFIG.nombre || APP_CONFIG.grupos.map(g => g.nombre).join(' y ');
    const set = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
    set('loginIglesia', nombre);
    set('marcaNombre', nombre);
    document.title = `Asistencia · ${nombre}`;

    const ARTICULO = { orquesta: 'la', coro: 'el' };
    const listaGrupos = APP_CONFIG.grupos.map(g => `${ARTICULO[g.id] || 'el'} ${g.nombre.toLowerCase()}`).join(' y ');
    set('inicioSubtitulo', `Resumen de la actividad de ${listaGrupos}`);
    set('statIntegrantesHint', `activos en ${listaGrupos}`);

    // Menú lateral: un ítem por grupo, antes de Reportes
    const fin = document.getElementById('menuGruposFin');
    if (fin) {
        document.querySelectorAll('.sidebar-menu li[data-grupo]').forEach(li => li.remove());
        APP_CONFIG.grupos.forEach(g => {
            const li = document.createElement('li');
            li.dataset.grupo = g.id;
            li.innerHTML = `<div class="sidebar-menu-item" data-tab="miembros" data-grupo="${g.id}" onclick="cambiarTab('miembros', '${g.id}')">
                ${iconoGrupo(g.id)}
                <span>${g.nombre}</span>
            </div>`;
            fin.before(li);
        });
        if (typeof cerrarSidebarAlHacerClick === 'function') cerrarSidebarAlHacerClick();
    }

    // Tarjetas de Inicio para registrar asistencia
    const tarjetas = document.getElementById('tarjetasGrupos');
    if (tarjetas) {
        tarjetas.innerHTML = APP_CONFIG.grupos.map(g => `
            <button class="card-grupo" onclick="irAAsistencia('${g.id}'); return false;" type="button">
                <div class="card-icon">${iconoGrupo(g.id, 48)}</div>
                <h3>${g.nombre}</h3>
                <p id="conteo-${g.id}" class="card-count">— integrantes</p>
                <div class="card-footer">
                    <span class="card-action">Registrar asistencia →</span>
                </div>
            </button>
        `).join('');
    }
}
