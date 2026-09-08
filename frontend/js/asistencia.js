// CONSTANTES
const INSTRUMENTOS = [
  'Violín', 'Viola', 'Violoncello', 'Contrabajo',
  'Flauta traversa', 'Oboe', 'Clarinete', 'Saxofón',
  'Trompeta', 'Corno', 'Trombón', 'Eufonio', 'Tuba',
  'Órgano', 'Acordeón', 'Bajo'
];

const VOCES = ['Soprano', 'Contralto', 'Tenor', 'Bajo'];

let miembrosActuales = [];
let grupoActual = null;
let asistenciasParaGuardar = {}; // Almacenar cambios

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

// ===== IR A ASISTENCIA =====
function irAAsistencia(grupo) {
    grupoActual = grupo;
    asistenciasParaGuardar = {}; // Limpiar cambios anteriores
    
    const modal = document.getElementById('modalConfigurarEvento');
    const fechaInput = document.getElementById('fechaEventoModal');
    if (modal && fechaInput) {
        fechaInput.valueAsDate = new Date();
        modal.classList.add('show');
    }
}

// ===== CARGAR MIEMBROS PARA ASISTENCIA =====
async function cargarMiembrosParaAsistencia(grupo) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const miembros = await response.json();
        miembrosActuales = miembros;
        
        const container = document.getElementById('asistenciaListBody');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!miembros || miembros.length === 0) {
            const div = document.createElement('div');
            div.style.padding = '40px';
            div.style.textAlign = 'center';
            div.style.color = 'var(--text-light)';
            div.textContent = 'No hay miembros registrados';
            container.appendChild(div);
            return;
        }
        
        miembros.forEach(miembro => {
            const detalleExtra = grupo === 'coro' ? (miembro.voz || '—') : (miembro.instrumento || '—');
            
            const row = document.createElement('div');
            row.className = 'miembro-row';
            row.innerHTML = `
                <div class="miembro-info">
                    <span class="miembro-nombre">${miembro.nombre}</span>
                    <span class="miembro-detalle">${detalleExtra}</span>
                </div>
                <div class="miembro-switches">
                    <label class="toggle-switch presente" title="Presente">
                        <input type="checkbox" data-miembro="${miembro.id}" data-tipo="presente" onchange="cambiarAsistencia(this)">
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">P</span>
                    </label>
                    <label class="toggle-switch ausente" title="Ausente">
                        <input type="checkbox" data-miembro="${miembro.id}" data-tipo="ausente" onchange="cambiarAsistencia(this)">
                        <span class="toggle-icon">✗</span>
                        <span class="toggle-label">A</span>
                    </label>
                    <label class="toggle-switch justificado" title="Justificado">
                        <input type="checkbox" data-miembro="${miembro.id}" data-tipo="justificado" onchange="cambiarAsistencia(this)">
                        <span class="toggle-icon">?</span>
                        <span class="toggle-label">AJ</span>
                    </label>
                </div>
            `;
            container.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar miembros');
    }
}

// ===== CAMBIAR ASISTENCIA (SIN GUARDAR) =====
function cambiarAsistencia(checkbox) {
    const miembroId = checkbox.dataset.miembro;
    const tipo = checkbox.dataset.tipo;
    
    // Desmarcar otros checkboxes del mismo miembro
    const row = checkbox.closest('.miembro-row');
    const switches = row.querySelectorAll('input[type="checkbox"]');
    
    switches.forEach(sw => {
        if (sw !== checkbox) sw.checked = false;
    });
    
    // Almacenar cambio
    if (checkbox.checked) {
        asistenciasParaGuardar[miembroId] = tipo;
    } else {
        delete asistenciasParaGuardar[miembroId];
    }
    
    console.log('Cambios pendientes:', asistenciasParaGuardar);
}

// ===== GUARDAR TODAS LAS ASISTENCIAS =====
async function guardarTodasAsistencias() {
    const fecha = window.fechaEventoSeleccionada;
    const tipoEvento = window.tipoEventoSeleccionado;
    
    if (!fecha || !tipoEvento) {
        mostrarError('Faltan datos del evento');
        return;
    }
    
    if (Object.keys(asistenciasParaGuardar).length === 0) {
        mostrarError('No hay cambios para guardar');
        return;
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    
    try {
        let registrosGuardados = 0;
        let errores = 0;
        
        // Guardar cada asistencia
        for (const [miembroId, tipo] of Object.entries(asistenciasParaGuardar)) {
            let presente;
            let nota = '';
            
            if (tipo === 'presente') {
                presente = true;
            } else if (tipo === 'ausente') {
                presente = false;
            } else if (tipo === 'justificado') {
                presente = null;
                nota = 'Justificado';
            }
            
            try {
                const response = await fetch(`${API_URL}/asistencia/registrar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        miembro_id: parseInt(miembroId),
                        tipo_evento: tipoEvento,
                        fecha: fecha,
                        presente: presente,
                        nota: nota
                    })
                });
                
                if (response.ok) {
                    registrosGuardados++;
                } else {
                    errores++;
                }
            } catch (err) {
                console.error('Error guardando miembro:', err);
                errores++;
            }
        }
        
        // Mostrar resultado
        if (registrosGuardados > 0) {
            mostrarToast(`${registrosGuardados} asistencias guardadas correctamente`, 'success');
            asistenciasParaGuardar = {}; // Limpiar
            cargarMiembrosParaAsistencia(grupoActual); // Recargar
        }
        
        if (errores > 0) {
            mostrarError(`${errores} registros con error`);
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al guardar asistencias');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Asistencias';
    }
}

// ===== AGREGAR MIEMBRO =====
function agregarMiembroActual() {
    if (!grupoActual) {
        mostrarError('Selecciona un grupo primero');
        return;
    }
    abrirModalAgregarMiembro(grupoActual);
}

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
            cargarMiembrosParaAsistencia(grupo);
            cargarConteosMiembros();
        } else {
            mostrarError(data.error || 'Error al agregar miembro');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al agregar miembro');
    }
}