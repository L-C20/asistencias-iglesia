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
        
        let miembros = await response.json();
        console.log('✅ Miembros recibidos (cantidad):', miembros.length);
        console.log('📋 Datos de miembros:', JSON.stringify(miembros.slice(0, 2)));
        
        // Aplicar filtro
        if (filtro && filtro !== '') {
            console.log('🔎 Aplicando filtro:', filtro);
            miembros = miembros.filter(m => m.instrumento === filtro);
            console.log('✓ Después de filtrar por instrumento:', miembros.length, 'miembros');
        }

        const containerId = 'listaMiembrosOrquesta';
        const container = document.getElementById(containerId);
        
        console.log('🎯 Buscando contenedor:', containerId, '- Encontrado:', !!container);
        
        if (!container) {
            console.error('❌ Contenedor no encontrado:', containerId);
            return;
        }
        
        const tbody = container.querySelector('tbody');
        console.log('📍 Tbody encontrado:', !!tbody);
        
        if (!tbody) {
            console.error('❌ tbody no encontrado en tabla');
            return;
        }
        
        // Limpiar tbody
        tbody.innerHTML = '';
        console.log('🧹 Tbody limpiado');
        
        if (!miembros || miembros.length === 0) {
            console.log('ℹ️ Sin miembros para mostrar');
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-light);">No hay integrantes registrados${filtro ? ' con este filtro' : ''}</td></tr>`;
            return;
        }
        
        console.log('🎨 Creando', miembros.length, 'filas de tabla');
        
        // Crear filas para cada miembro
        miembros.forEach((miembro, index) => {
            const instrumento = miembro.instrumento
                ? miembro.instrumento
                : '<span class="sin-asignar">Sin asignar</span>';

            console.log(`  Fila ${index + 1}: ${miembro.nombre} - ${miembro.instrumento || 'sin instrumento'}`);
            
            const tr = document.createElement('tr');
            tr.className = 'tabla-row';
            tr.id = `miembro-row-${miembro.id}`;
            tr.innerHTML = `
                <td class="celda-nombre">${miembro.nombre || 'Sin nombre'}</td>
                <td class="celda-detalle">${instrumento}</td>
                <td class="celda-acciones">
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
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        console.log('✨ Tabla cargada exitosamente');
        
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
                cargarMiembrosPorFiltro('orquesta', '');
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
                cargarMiembrosPorFiltro('orquesta', '');
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
            cargarMiembrosPorFiltro('orquesta', '');
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

    // El filtro se alimenta de la misma lista que el formulario
    const filtro = document.getElementById('filtroInstrumentoOrquesta');
    if (filtro) {
        INSTRUMENTOS.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            filtro.appendChild(option);
        });
    }
    setTimeout(() => {
        if (typeof token !== 'undefined' && token) {
            console.log('✅ TOKEN DISPONIBLE - Cargando datos...');
            cargarMiembrosPorFiltro('orquesta', '');
            cargarConteosMiembros();
        } else {
            console.warn('⚠️ TOKEN NO DISPONIBLE AÚN');
        }
    }, 1000);
});

console.log('✅ miembros-v7.js CARGADO');