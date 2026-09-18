// CONSTANTES
const INSTRUMENTOS = [
  'Violín 1', 'Violín 2', 'Viola', 'Cello',
  'Flauta', 'Oboe', 'Clarinete',
  'Sx. Alto', 'Sx. Tenor', 'Sx. Barítono',
  'Trompeta', 'Corno', 'Trombón', 'Eufonio', 'Tuba',
  'Órgano', 'Bajo', 'Acordeón', 'Bandoneón'
];

// Variables globales para editar
let miembroEnEdicion = null;

// Qué secciones dejó abiertas el usuario; sobrevive a recargas de la lista
const seccionesAbiertasMiembros = new Set();

function expandirSeccionesMiembros(abrir) {
    document.querySelectorAll('#listaMiembrosOrquesta .seccion-instrumento').forEach(s => { s.open = abrir; });
}

// Recarga la lista respetando lo que haya escrito en el buscador
function recargarMiembros() {
    const buscador = document.getElementById('buscarMiembro');
    cargarMiembrosPorFiltro('orquesta', buscador ? buscador.value : '');
}

// ===== CARGAR MIEMBROS CON FILTRO =====
async function cargarMiembrosPorFiltro(grupo, filtro = '') {
    try {
        console.log('🔍 INICIO cargarMiembrosPorFiltro:', { grupo, filtro, API_URL, token: !!token });
        
        if (!API_URL || !token) {
            console.error('❌ Faltan variables:', { API_URL, token: !!token });
            mostrarError('Error: Sesión no inicializada');
            return;
        }
        
        const url = `${API_URL}/asistencia/miembros/${grupo}`;
        console.log('📡 Fetch a:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Error en response:', response.status, response.statusText);
            throw new Error(`Error: ${response.status}`);
        }
        
        const miembros = await response.json();
        console.log('✅ Miembros recibidos (cantidad):', miembros.length);

        const container = document.getElementById('listaMiembrosOrquesta');
        if (!container) {
            console.error('❌ Contenedor listaMiembrosOrquesta no encontrado');
            return;
        }

        // Búsqueda por nombre o instrumento, sin distinguir mayúsculas ni acentos
        const texto = normalizar(filtro);
        const visibles = texto
            ? miembros.filter(m => normalizar(`${m.nombre} ${m.instrumento || ''}`).includes(texto))
            : miembros;

        container.innerHTML = '';

        if (visibles.length === 0) {
            container.innerHTML = `<p class="lista-vacia">${texto ? 'Ningún integrante coincide con la búsqueda' : 'No hay integrantes registrados'}</p>`;
            return;
        }

        // Agrupar por instrumento en el orden de la orquesta
        const porInstrumento = {};
        visibles.forEach(m => {
            const clave = m.instrumento || 'Sin instrumento';
            (porInstrumento[clave] = porInstrumento[clave] || []).push(m);
        });
        const orden = [
            ...INSTRUMENTOS.filter(i => porInstrumento[i]),
            ...Object.keys(porInstrumento).filter(k => !INSTRUMENTOS.includes(k))
        ];

        orden.forEach(instrumento => {
            const seccion = document.createElement('details');
            seccion.className = 'seccion-instrumento';
            seccion.dataset.instrumento = instrumento;
            // Con búsqueda activa se abren las secciones que coinciden
            seccion.open = !!texto || seccionesAbiertasMiembros.has(instrumento);
            seccion.addEventListener('toggle', () => {
                if (seccion.open) seccionesAbiertasMiembros.add(instrumento);
                else seccionesAbiertasMiembros.delete(instrumento);
            });

            const cabecera = document.createElement('summary');
            cabecera.className = 'seccion-cabecera';
            cabecera.innerHTML = `
                <svg class="seccion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span class="seccion-nombre">${instrumento}</span>
                <span class="seccion-contador">${porInstrumento[instrumento].length}</span>
            `;

            const cuerpo = document.createElement('div');
            cuerpo.className = 'seccion-cuerpo';

            porInstrumento[instrumento].forEach(miembro => {
                const fila = document.createElement('div');
                fila.className = 'miembro-row';
                fila.id = `miembro-row-${miembro.id}`;
                fila.innerHTML = `
                    <div class="miembro-info">
                        <div class="miembro-nombre">${miembro.nombre || 'Sin nombre'}</div>
                    </div>
                    <div class="celda-acciones">
                        <button class="btn btn-sm btn-secondary" type="button" onclick="editarMiembroFunc(${miembro.id}); return false;" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-danger" type="button" onclick="eliminarMiembroConfirm(${miembro.id}); return false;" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
                cuerpo.appendChild(fila);
            });

            seccion.append(cabecera, cuerpo);
            container.appendChild(seccion);
        });

        console.log('✨ Lista cargada:', visibles.length, 'integrantes en', orden.length, 'secciones');
        
    } catch (error) {
        console.error('❌ Error en cargarMiembrosPorFiltro:', error);
        mostrarError('Error al cargar integrantes: ' + error.message);
    }
}

// ===== ABRIR MODAL AGREGAR MIEMBRO =====
function abrirModalAgregarMiembro() {
    const modal = document.getElementById('modalAgregarMiembro');
    if (!modal) return;

    miembroEnEdicion = null;

    // Actualizar título y botón
    document.getElementById('modalTitulo').textContent = 'Agregar Nuevo Miembro';
    document.getElementById('btnGuardarTexto').textContent = 'Agregar';

    document.getElementById('nombreNuevo').value = '';

    const selectInstrumento = document.getElementById('instrumentoNuevo');
    selectInstrumento.innerHTML = '<option value="">-- Seleccionar instrumento --</option>';
    selectInstrumento.style.display = 'block';

    INSTRUMENTOS.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst;
        option.textContent = inst;
        selectInstrumento.appendChild(option);
    });

    modal.classList.add('show');
}

// ===== EDITAR MIEMBRO =====
async function editarMiembroFunc(miembroId) {
    try {
        console.log('✏️ Editando miembro:', miembroId);

        // Cargar datos del miembro
        const response = await fetch(`${API_URL}/asistencia/miembro/${miembroId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('No se pudo cargar el miembro');
        }
        
        const miembro = await response.json();
        console.log('📋 Datos del miembro:', miembro);
        
        miembroEnEdicion = miembro;

        // Actualizar título y botón
        document.getElementById('modalTitulo').textContent = 'Editar Integrante';
        document.getElementById('btnGuardarTexto').textContent = 'Guardar Cambios';

        // Abrir modal en modo edición
        const modal = document.getElementById('modalAgregarMiembro');
        if (!modal) return;

        document.getElementById('nombreNuevo').value = miembro.nombre;

        const selectInstrumento = document.getElementById('instrumentoNuevo');
        selectInstrumento.innerHTML = '<option value="">-- Seleccionar instrumento --</option>';
        selectInstrumento.style.display = 'block';

        INSTRUMENTOS.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            if (inst === miembro.instrumento) option.selected = true;
            selectInstrumento.appendChild(option);
        });

        modal.classList.add('show');
        mostrarToast('Editando integrante', 'info');
        
    } catch (error) {
        console.error('❌ Error al editar:', error);
        mostrarError('Error al cargar datos del integrante');
    }
}

// ===== GUARDAR NUEVO MIEMBRO O EDITAR =====
async function guardarNuevoMiembro(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreNuevo').value;
    const instrumento = document.getElementById('instrumentoNuevo').value;

    if (!nombre) {
        mostrarError('El nombre es requerido');
        return;
    }

    if (!instrumento) {
        mostrarError('Debe seleccionar un instrumento');
        return;
    }

    try {
        // Si está editando
        if (miembroEnEdicion) {
            console.log('🔄 Actualizando miembro:', miembroEnEdicion.id);
            
            const response = await fetch(`${API_URL}/asistencia/miembro/${miembroEnEdicion.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: nombre,
                    instrumento: instrumento
                })
            });

            const data = await response.json();

            if (response.ok) {
                cerrarModalMiembro();
                mostrarToast('Integrante actualizado correctamente', 'success');
                recargarMiembros();
                cargarConteosMiembros();
            } else {
                mostrarError(data.error || 'Error al actualizar');
            }
        } else {
            // Si está creando nuevo
            console.log('➕ Creando nuevo miembro');
            
            const response = await fetch(`${API_URL}/asistencia/miembro/nuevo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: nombre,
                    grupo: 'orquesta',
                    instrumento: instrumento
                })
            });

            const data = await response.json();

            if (response.ok) {
                cerrarModalMiembro();
                mostrarToast('Integrante agregado correctamente', 'success');
                recargarMiembros();
                cargarConteosMiembros();
            } else {
                mostrarError(data.error || 'Error al agregar integrante');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al guardar integrante');
    }
}

// ===== ELIMINAR MIEMBRO CON CONFIRMACIÓN =====
function eliminarMiembroConfirm(miembroId) {
    if (confirm('¿Estás seguro de que deseas eliminar este integrante?')) {
        eliminarMiembro(miembroId);
    }
}

// ===== ELIMINAR MIEMBRO =====
async function eliminarMiembro(miembroId) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembro/${miembroId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            mostrarToast('Integrante eliminado correctamente', 'success');
            recargarMiembros();
            cargarConteosMiembros();
        } else {
            mostrarError('Error al eliminar integrante');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al eliminar integrante');
    }
}

// ===== CARGAR CONTEOS =====
async function cargarConteosMiembros() {
    try {
        const respOrquesta = await fetch(`${API_URL}/asistencia/miembros/orquesta`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const miembrosOrquesta = await respOrquesta.json();
        const orquestaCount = document.getElementById('orquestaCount');
        if (orquestaCount) orquestaCount.textContent = `${miembrosOrquesta.length} integrantes`;
    } catch (error) {
        console.error('Error cargando conteos:', error);
    }
}

// ===== RESUMEN DE INICIO =====
async function cargarResumenInicio() {
    try {
        const response = await fetch(`${API_URL}/reportes/resumen/orquesta`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const r = await response.json();

        const set = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.textContent = valor;
        };

        set('statIntegrantes', r.integrantes);
        set('statEventos', r.eventos);
        set('statPresentismo', r.asistencia_promedio === null ? '—' : `${r.asistencia_promedio}%`);

        if (r.ultima_fecha) {
            // "T00:00:00" sin zona fuerza hora local; sin eso se interpreta como UTC
            const f = new Date(r.ultima_fecha + 'T00:00:00');
            set('statUltima', f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }));
            set('statUltimaHint', f.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));
        } else {
            set('statUltima', '—');
            set('statUltimaHint', 'sin registros aún');
        }
    } catch (error) {
        console.error('❌ Error cargando resumen:', error);
    }
}

// ===== CERRAR MODAL =====
// Nombre propio: configuracion.js define su propio cerrarModal(modalId) y se carga después.
function cerrarModalMiembro() {
    const modal = document.getElementById('modalAgregarMiembro');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('formNuevoMiembro').reset();
    miembroEnEdicion = null;
}

// ===== INICIALIZAR AL CARGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM CARGADO - Inicializando...');

    setTimeout(() => {
        if (typeof token !== 'undefined' && token) {
            console.log('✅ TOKEN DISPONIBLE - Cargando datos...');
            recargarMiembros();
            cargarConteosMiembros();
        } else {
            console.warn('⚠️ TOKEN NO DISPONIBLE AÚN');
        }
    }, 1000);
});

console.log('✅ miembros-v7.js CARGADO');