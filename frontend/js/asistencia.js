// Variables globales
let miembrosActuales = [];
let grupoActual = null;
let asistenciasParaGuardar = {};
let tipoEventoActual = null;
let fechaEventoActual = null;

// ===== IR A ASISTENCIA =====
function irAAsistencia(grupo) {
    console.log('🔄 irAAsistencia:', grupo);
    grupoActual = grupo;
    
    const modal = document.getElementById('modalEvento');
    if (modal) {
        modal.classList.add('show');
        console.log('📂 Modal de evento abierto');
    } else {
        console.error('❌ Modal no encontrado: modalEvento');
    }
}

// ===== GUARDAR CONFIGURACIÓN DEL EVENTO =====
function guardarConfiguracionEvento(e) {
    e.preventDefault();
    console.log('💾 guardarConfiguracionEvento');
    
    const tipoEvento = document.getElementById('tipoEvento')?.value;
    const fecha = document.getElementById('fechaEvento')?.value;
    
    console.log('  Tipo Evento:', tipoEvento);
    console.log('  Fecha:', fecha);
    console.log('  Grupo:', grupoActual);
    
    if (!tipoEvento || !fecha) {
        mostrarError('Selecciona tipo de evento y fecha');
        return;
    }
    
    tipoEventoActual = tipoEvento;
    fechaEventoActual = fecha;
    
    // Cerrar modal de evento y cargar miembros
    cerrarModalEvento();
    
    // Pequeño delay para que se cierre el modal
    setTimeout(() => {
        cargarMiembrosParaAsistencia(grupoActual);
    }, 100);
}

// ===== CARGAR MIEMBROS PARA ASISTENCIA =====
async function cargarMiembrosParaAsistencia(grupo) {
    try {
        console.log('📋 Cargando miembros para asistencia:', grupo);
        
        const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar miembros');
        }
        
        miembrosActuales = await response.json();
        console.log('✅ Miembros cargados:', miembrosActuales.length);
        
        // Cargar registros existentes
        await cargarRegistrosExistentes(grupo);
        
        // Renderizar lista de miembros
        renderizarListaAsistencia(grupo);
        
        // Cambiar a pestaña de asistencia
        cambiarTab('asistencia-' + grupo);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar miembros');
    }
}

// ===== CARGAR REGISTROS EXISTENTES =====
async function cargarRegistrosExistentes(grupo) {
    try {
        const url = `${API_URL}/asistencia/${grupo}/${fechaEventoActual}/${tipoEventoActual}`;
        console.log('📡 Fetch registros:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const registros = await response.json();
            console.log('✅ Registros existentes:', registros.length);
            
            // Guardar en objeto para acceso rápido
            registros.forEach(reg => {
                asistenciasParaGuardar[reg.miembro_id] = {
                    presente: reg.presente,
                    nota: reg.nota || ''
                };
            });
        }
    } catch (error) {
        console.error('⚠️ Error cargando registros existentes:', error);
        // No es crítico si no encuentra registros previos
    }
}

// ===== RENDERIZAR LISTA DE ASISTENCIA =====
function renderizarListaAsistencia(grupo) {
    console.log('🎨 Renderizando lista de asistencia para:', grupo);
    
    const containerId = grupo === 'coro' ? 'listaMiembrosAsistenciaCoro' : 'listaMiembrosAsistenciaOrquesta';
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('❌ Contenedor no encontrado:', containerId);
        return;
    }
    
    container.innerHTML = '';
    
    if (miembrosActuales.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No hay integrantes en este grupo</p>';
        return;
    }
    
    miembrosActuales.forEach(miembro => {
        const registro = asistenciasParaGuardar[miembro.id] || { presente: null, nota: '' };
        
        const miembroDiv = document.createElement('div');
        miembroDiv.className = 'miembro-row';
        miembroDiv.id = `asistencia-${miembro.id}`;
        
        miembroDiv.innerHTML = `
            <div class="miembro-info">
                <div class="miembro-nombre">${miembro.nombre}</div>
                <div class="miembro-detalle">${grupo === 'coro' ? (miembro.voz || 'Sin asignar') : (miembro.instrumento || 'Sin asignar')}</div>
            </div>
            <div class="miembro-switches">
                <label class="switch-label">
                    <input type="radio" name="asistencia-${miembro.id}" value="present" 
                        onchange="cambiarAsistencia(this)" 
                        ${registro.presente === true ? 'checked' : ''} />
                    <span class="switch-text">Presente</span>
                </label>
                <label class="switch-label">
                    <input type="radio" name="asistencia-${miembro.id}" value="absent" 
                        onchange="cambiarAsistencia(this)" 
                        ${registro.presente === false ? 'checked' : ''} />
                    <span class="switch-text">Ausente</span>
                </label>
                <label class="switch-label">
                    <input type="radio" name="asistencia-${miembro.id}" value="justified" 
                        onchange="cambiarAsistencia(this)" 
                        ${registro.presente === 'justified' ? 'checked' : ''} />
                    <span class="switch-text">Justificado</span>
                </label>
            </div>
        `;
        
        container.appendChild(miembroDiv);
    });
    
    console.log('✅ Lista renderizada');
}

// ===== CAMBIAR ASISTENCIA =====
function cambiarAsistencia(checkbox) {
    const name = checkbox.name; // "asistencia-{miembro_id}"
    const miembroId = parseInt(name.split('-')[1]);
    
    let presente;
    if (checkbox.value === 'present') presente = true;
    else if (checkbox.value === 'absent') presente = false;
    else if (checkbox.value === 'justified') presente = 'justified';
    
    asistenciasParaGuardar[miembroId] = {
        presente: presente,
        nota: asistenciasParaGuardar[miembroId]?.nota || ''
    };
    
    console.log('✏️ Asistencia actualizada:', { miembroId, presente });
}

// ===== GUARDAR TODAS LAS ASISTENCIAS =====
async function guardarTodasAsistencias() {
    try {
        console.log('💾 Guardando asistencias...');
        console.log('   Grupo:', grupoActual);
        console.log('   Tipo evento:', tipoEventoActual);
        console.log('   Fecha:', fechaEventoActual);
        console.log('   Total registros:', Object.keys(asistenciasParaGuardar).length);
        
        let guardados = 0;
        let errores = 0;
        
        for (const [miembroId, asistencia] of Object.entries(asistenciasParaGuardar)) {
            try {
                // Solo guardar si tiene un valor definido
                if (asistencia.presente === null || asistencia.presente === undefined) {
                    console.log(`⏭️  Saltando miembro ${miembroId} - sin asistencia definida`);
                    continue;
                }
                
                const response = await fetch(`${API_URL}/asistencia/registrar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        miembro_id: parseInt(miembroId),
                        tipo_evento: tipoEventoActual,
                        fecha: fechaEventoActual,
                        presente: asistencia.presente,
                        nota: asistencia.nota || null
                    })
                });
                
                if (response.ok) {
                    guardados++;
                    console.log(`  ✅ Miembro ${miembroId} guardado`);
                } else {
                    errores++;
                    console.error(`  ❌ Error guardando miembro ${miembroId}`);
                }
            } catch (error) {
                errores++;
                console.error(`  ❌ Error con miembro ${miembroId}:`, error);
            }
        }
        
        console.log(`✅ Proceso completado: ${guardados} guardados, ${errores} errores`);
        
        if (guardados > 0) {
            mostrarToast(`${guardados} asistencias guardadas correctamente`, 'success');
            
            // Limpiar y volver al inicio
            limpiarAsistencia();
            cambiarTab('inicio');
        } else if (errores > 0) {
            mostrarError('Error al guardar asistencias');
        } else {
            mostrarError('Marca al menos una asistencia');
        }
        
    } catch (error) {
        console.error('❌ Error guardando:', error);
        mostrarError('Error al guardar asistencias');
    }
}

// ===== LIMPIAR ASISTENCIA =====
function limpiarAsistencia() {
    miembrosActuales = [];
    grupoActual = null;
    asistenciasParaGuardar = {};
    tipoEventoActual = null;
    fechaEventoActual = null;
    console.log('🧹 Asistencia limpiada');
}

// ===== CERRAR MODAL DE EVENTO =====
function cerrarModalEvento() {
    const modal = document.getElementById('modalEvento');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('formConfigurarEvento').reset();
    console.log('❌ Modal de evento cerrado');
}

console.log('✅ asistencia-v11.js CARGADO');