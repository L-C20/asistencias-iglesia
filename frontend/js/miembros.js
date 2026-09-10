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
        console.log('🔍 INICIO cargarMiembrosPorFiltro:', { grupo, filtro });
        
        if (!API_URL || !token) {
            console.error('❌ FALTAN VARIABLES:', { API_URL, token: !!token });
            mostrarError('Error: Sesión no inicializada');
            return;
        }
        
        const url = `${API_URL}/asistencia/miembros/${grupo}`;
        console.log('📡 FETCH A:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✓ RESPONSE STATUS:', response.status, response.statusText);
        
        if (!response.ok) {
            console.error('❌ RESPONSE ERROR:', response.status);
            throw new Error(`Error: ${response.status}`);
        }
        
        let miembros = await response.json();
        console.log('📦 MIEMBROS RECIBIDOS:', miembros.length, 'items');
        
        // Debuggear primer miembro
        if (miembros.length > 0) {
            console.log('🔎 ESTRUCTURA PRIMER MIEMBRO:', JSON.stringify(miembros[0], null, 2));
            console.log('   - ID:', miembros[0].id);
            console.log('   - Nombre:', miembros[0].nombre);
            console.log('   - Grupo:', miembros[0].grupo);
            console.log('   - Voz:', miembros[0].voz);
            console.log('   - Instrumento:', miembros[0].instrumento);
        }
        
        // Aplicar filtro
        if (filtro && filtro !== '') {
            console.log('🔎 APLICANDO FILTRO:', filtro);
            if (grupo === 'coro') {
                const antes = miembros.length;
                miembros = miembros.filter(m => m.voz === filtro);
                console.log(`   Coro: ${antes} → ${miembros.length} (filtro: voz)`);
            } else if (grupo === 'orquesta') {
                const antes = miembros.length;
                miembros = miembros.filter(m => m.instrumento === filtro);
                console.log(`   Orquesta: ${antes} → ${miembros.length} (filtro: instrumento)`);
            }
        }
        
        const containerId = grupo === 'coro' ? 'listaMiembrosCoro' : 'listaMiembrosOrquesta';
        const container = document.getElementById(containerId);
        
        if (!container) {
            console.error('❌ CONTENEDOR NO ENCONTRADO:', containerId);
            return;
        }
        
        const tbody = container.querySelector('tbody');
        if (!tbody) {
            console.error('❌ TBODY NO ENCONTRADO');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!miembros || miembros.length === 0) {
            console.log('ℹ️ SIN MIEMBROS');
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--text-light);">No hay integrantes registrados${filtro ? ' con este filtro' : ''}</td></tr>`;
            return;
        }
        
        console.log('🎨 CREANDO FILAS:', miembros.length);
        
        // Crear filas para cada miembro
        miembros.forEach((miembro, index) => {
            // Acceder correctamente a los datos
            const nombre = miembro.nombre || 'Sin nombre';
            const voz = miembro.voz || null;
            const instrumento = miembro.instrumento || null;
            const detalleExtra = grupo === 'coro' 
                ? (voz || 'Sin asignar') 
                : (instrumento || 'Sin asignar');
            
            console.log(`   Fila ${index + 1}: "${nombre}" - Detalle: "${detalleExtra}"`);
            
            const tr = document.createElement('tr');
            tr.className = 'tabla-row';
            tr.id = `miembro-row-${grupo}-${miembro.id}`;
            
            // Crear HTML de fila
            tr.innerHTML = `
                <td class="celda-nombre">${nombre}</td>
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
        
        console.log('✅ TABLA CARGADA EXITOSAMENTE');
        
    } catch (error) {
        console.error('❌ ERROR CRÍTICO:', error.message, error.stack);
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
    console.log('✏️ Editando miembro:', miembroId, 'Grupo:', grupo);
    mostrarToast('Funcionalidad en desarrollo - próximamente', 'info');
    // TODO: Implementar modal de edición
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
    console.log('📄 DOM CARGADO - Inicializando...');
    setTimeout(() => {
        if (typeof token !== 'undefined' && token) {
            console.log('✅ TOKEN DISPONIBLE - Cargando datos...');
            cargarMiembrosPorFiltro('coro', '');
            cargarMiembrosPorFiltro('orquesta', '');
            cargarConteosMiembros();
        } else {
            console.warn('⚠️ TOKEN NO DISPONIBLE AÚN');
        }
    }, 1000);
});

console.log('✅ miembros-v6.js CARGADO');