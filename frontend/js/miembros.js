// CONSTANTES
const INSTRUMENTOS = [
  'Violín', 'Viola', 'Violoncello', 'Contrabajo',
  'Flauta traversa', 'Oboe', 'Clarinete', 'Saxofón',
  'Trompeta', 'Corno', 'Trombón', 'Eufonio', 'Tuba',
  'Órgano', 'Acordeón', 'Bajo'
];

const VOCES = ['Soprano', 'Contralto', 'Tenor', 'Bajo'];

// ===== CARGAR MIEMBROS CON FILTRO =====
async function cargarMiembrosPorFiltro(grupo, filtro = '') {
    try {
        console.log('🔍 Iniciando cargarMiembrosPorFiltro:', { grupo, filtro, API_URL, token: !!token });
        
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
            if (grupo === 'coro') {
                miembros = miembros.filter(m => m.voz === filtro);
                console.log('✓ Después de filtrar por voz:', miembros.length, 'miembros');
            } else if (grupo === 'orquesta') {
                miembros = miembros.filter(m => m.instrumento === filtro);
                console.log('✓ Después de filtrar por instrumento:', miembros.length, 'miembros');
            }
        }
        
        const containerId = grupo === 'coro' ? 'listaMiembrosCoro' : 'listaMiembrosOrquesta';
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
            const detalleExtra = grupo === 'coro' 
                ? (miembro.voz || 'Sin asignar') 
                : (miembro.instrumento || 'Sin asignar');
            
            console.log(`  Fila ${index + 1}: ${miembro.nombre} - ${detalleExtra}`);
            
            const tr = document.createElement('tr');
            tr.className = 'tabla-row';
            tr.id = `miembro-row-${grupo}-${miembro.id}`;
            tr.innerHTML = `
                <td class="celda-nombre">${miembro.nombre || 'Sin nombre'}</td>
                <td class="celda-detalle"><strong>${detalleExtra}</strong></td>
                <td class="celda-acciones">
                    <button class="btn btn-sm btn-secondary" type="button" onclick="editarMiembroFunc(${miembro.id}, '${grupo}'); return false;" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" type="button" onclick="eliminarMiembroConfirm(${miembro.id}, '${grupo}'); return false;" title="Eliminar">
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
function abrirModalAgregarMiembro(grupo) {
    const modal = document.getElementById('modalAgregarMiembro');
    if (!modal) return;
    
    document.getElementById('grupoNuevo').value = grupo;
    document.getElementById('nombreNuevo').value = '';
    
    const selectInstrumento = document.getElementById('instrumentoNuevo');
    const selectVoz = document.getElementById('vozNueva');
    
    selectInstrumento.innerHTML = '<option value="">-- Seleccionar instrumento --</option>';
    selectVoz.innerHTML = '<option value="">-- Seleccionar voz --</option>';
    
    if (grupo === 'orquesta') {
        selectInstrumento.style.display = 'block';
        selectVoz.style.display = 'none';
        document.getElementById('labelInstrumento').style.display = 'block';
        document.getElementById('labelVoz').style.display = 'none';
        
        INSTRUMENTOS.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            selectInstrumento.appendChild(option);
        });
    } else {
        selectInstrumento.style.display = 'none';
        selectVoz.style.display = 'block';
        document.getElementById('labelInstrumento').style.display = 'none';
        document.getElementById('labelVoz').style.display = 'block';
        
        VOCES.forEach(voz => {
            const option = document.createElement('option');
            option.value = voz;
            option.textContent = voz;
            selectVoz.appendChild(option);
        });
    }
    
    modal.classList.add('show');
}

// ===== GUARDAR NUEVO MIEMBRO =====
async function guardarNuevoMiembro(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombreNuevo').value;
    const grupo = document.getElementById('grupoNuevo').value;
    const instrumento = document.getElementById('instrumentoNuevo').value;
    const voz = document.getElementById('vozNueva').value;
    
    if (!nombre) {
        mostrarError('El nombre es requerido');
        return;
    }
    
    if (grupo === 'orquesta' && !instrumento) {
        mostrarError('Debe seleccionar un instrumento');
        return;
    }
    
    if (grupo === 'coro' && !voz) {
        mostrarError('Debe seleccionar una voz');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/asistencia/miembro/nuevo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: nombre,
                grupo: grupo,
                instrumento: grupo === 'orquesta' ? instrumento : null,
                voz: grupo === 'coro' ? voz : null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            cerrarModal();
            mostrarToast('Miembro agregado correctamente', 'success');
            cargarMiembrosPorFiltro(grupo, '');
            cargarConteosMiembros();
        } else {
            mostrarError(data.error || 'Error al agregar miembro');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al agregar miembro');
    }
}

// ===== EDITAR MIEMBRO =====
function editarMiembroFunc(miembroId, grupo) {
    mostrarToast('Funcionalidad en desarrollo', 'info');
}

// ===== ELIMINAR MIEMBRO CON CONFIRMACIÓN =====
function eliminarMiembroConfirm(miembroId, grupo) {
    if (confirm('¿Estás seguro de que deseas eliminar este integrante?')) {
        eliminarMiembro(miembroId, grupo);
    }
}

// ===== ELIMINAR MIEMBRO =====
async function eliminarMiembro(miembroId, grupo) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembro/${miembroId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            mostrarToast('Integrante eliminado correctamente', 'success');
            cargarMiembrosPorFiltro(grupo, '');
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
        const respCoro = await fetch(`${API_URL}/asistencia/miembros/coro`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const miembrosCoro = await respCoro.json();
        const coroCount = document.getElementById('coroCount');
        if (coroCount) coroCount.textContent = `${miembrosCoro.length} integrantes`;

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

// ===== CERRAR MODAL =====
function cerrarModal() {
    const modal = document.getElementById('modalAgregarMiembro');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('formNuevoMiembro').reset();
}

// ===== INICIALIZAR AL CARGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, inicializando carga de miembros');
    setTimeout(() => {
        if (typeof token !== 'undefined' && token) {
            cargarMiembrosPorFiltro('coro', '');
            cargarMiembrosPorFiltro('orquesta', '');
            cargarConteosMiembros();
            console.log('✅ Datos iniciales cargados');
        } else {
            console.error('⚠️ Token no disponible aún');
        }
    }, 1000);
});

console.log('✅ miembros-v5.js cargado');