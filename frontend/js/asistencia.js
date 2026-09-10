// Variables globales
let miembrosActuales = [];
let grupoActual = null;
let asistenciasParaGuardar = {};
let tipoEventoActual = null;
let fechaEventoActual = null;

console.log('🚀 asistencia-v12.js iniciando');

// ===== IR A ASISTENCIA =====
function irAAsistencia(grupo) {
    console.log('═══════════════════════════════════════');
    console.log('🔄 [irAAsistencia] Iniciando - Grupo:', grupo);
    console.log('═══════════════════════════════════════');
    
    // Verificar que grupo sea válido
    if (!grupo || (grupo !== 'coro' && grupo !== 'orquesta')) {
        console.error('❌ Grupo inválido:', grupo);
        mostrarError('Grupo inválido');
        return;
    }
    
    grupoActual = grupo;
    console.log('✅ grupoActual establecido:', grupoActual);
    
    // Buscar modal - ID correcto: modalConfigurarEvento
    const modal = document.getElementById('modalConfigurarEvento');
    console.log('🔍 Buscando modal con ID "modalConfigurarEvento":', modal ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    
    if (modal) {
        // Verificar si tiene la clase 'show'
        const tieneShow = modal.classList.contains('show');
        console.log('   - Modal tiene clase "show":', tieneShow);
        
        modal.classList.add('show');
        console.log('✅ Modal abierto - clase "show" agregada');
        console.log('✅ Display:', window.getComputedStyle(modal).display);
        
        // Reset del formulario
        const form = document.getElementById('formConfigurarEvento');
        if (form) {
            form.reset();
            console.log('✅ Formulario limpiado');
        }
        
        console.log('═══════════════════════════════════════');
        console.log('✅ [irAAsistencia] COMPLETADO');
        console.log('═══════════════════════════════════════');
    } else {
        console.error('═══════════════════════════════════════');
        console.error('❌ [irAAsistencia] ERROR CRÍTICO');
        console.error('   Modal "modalConfigurarEvento" no encontrado en el DOM');
        console.error('═══════════════════════════════════════');
        mostrarError('Error: Modal no encontrado');
    }
}

// ===== GUARDAR CONFIGURACIÓN DEL EVENTO =====
function guardarConfiguracionEvento(e) {
    e.preventDefault();
    console.log('💾 [guardarConfiguracionEvento] Iniciando');
    
    // IDs correctos del HTML
    const tipoEventoRadios = document.querySelectorAll('input[name="tipoEvento"]:checked');
    const tipoEvento = tipoEventoRadios.length > 0 ? tipoEventoRadios[0].value : null;
    
    const fecha = document.getElementById('fechaEventoModal')?.value;
    
    console.log('  - Tipo Evento:', tipoEvento);
    console.log('  - Fecha:', fecha);
    console.log('  - Grupo:', grupoActual);
    
    if (!tipoEvento || !fecha) {
        console.error('❌ Datos incompletos');
        mostrarError('Selecciona tipo de evento y fecha');
        return;
    }
    
    tipoEventoActual = tipoEvento;
    fechaEventoActual = fecha;
    
    console.log('✅ Datos guardados');
    
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
        console.log('📋 [cargarMiembrosParaAsistencia] Cargando para:', grupo);
        
        if (!API_URL || !token) {
            console.error('❌ Sin API_URL o token');
            mostrarError('Error: No autenticado');
            return;
        }
        
        const url = `${API_URL}/asistencia/miembros/${grupo}`;
        console.log('📡 Fetch a:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Response status:', response.status);
        
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
        console.log('🎯 Cambiando a tab: asistencia-' + grupo);
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
        console.log('📡 [cargarRegistrosExistentes] Fetch:', url);
        
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
    console.log('🎨 [renderizarListaAsistencia] Grupo:', grupo);
    
    const containerId = grupo === 'coro' ? 'listaMiembrosAsistenciaCoro' : 'listaMiembrosAsistenciaOrquesta';
    const container = document.getElementById(containerId);
    
    console.log('🔍 Contenedor ID:', containerId);
    console.log('   Encontrado:', container ? '✅' : '❌');
    
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
    
    console.log('✅ Lista renderizada con', miembrosActuales.length, 'miembros');
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
        console.log('═══════════════════════════════════════');
        console.log('💾 [guardarTodasAsistencias] Iniciando');
        console.log('   Grupo:', grupoActual);
        console.log('   Tipo evento:', tipoEventoActual);
        console.log('   Fecha:', fechaEventoActual);
        console.log('   Total registros:', Object.keys(asistenciasParaGuardar).length);
        console.log('═══════════════════════════════════════');
        
        let guardados = 0;
        let errores = 0;
        
        for (const [miembroId, asistencia] of Object.entries(asistenciasParaGuardar)) {
            try {
                // Solo guardar si tiene un valor definido
                if (asistencia.presente === null || asistencia.presente === undefined) {
                    console.log(`⏭️  Saltando miembro ${miembroId} - sin asistencia`);
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
                    const errorData = await response.json();
                    console.error(`  ❌ Error guardando miembro ${miembroId}:`, errorData);
                }
            } catch (error) {
                errores++;
                console.error(`  ❌ Error con miembro ${miembroId}:`, error);
            }
        }
        
        console.log(`═══════════════════════════════════════`);
        console.log(`✅ Proceso completado: ${guardados} guardados, ${errores} errores`);
        console.log(`═══════════════════════════════════════`);
        
        if (guardados > 0) {
            mostrarToast(`✅ ${guardados} asistencias guardadas correctamente`, 'success');
            
            // Limpiar datos
            console.log('🧹 Limpiando datos de asistencia');
            limpiarAsistencia();
            
            // Pequeño delay y volver a inicio
            setTimeout(() => {
                console.log('🏠 Volviendo a Inicio');
                cambiarTab('inicio');
            }, 500);
        } else if (errores > 0) {
            console.error('❌ Hubo errores al guardar');
            mostrarError('Error al guardar asistencias');
        } else {
            console.warn('⚠️ No se marcó ninguna asistencia');
            mostrarError('Marca al menos una asistencia');
        }
        
    } catch (error) {
        console.error('❌ Error crítico guardando:', error);
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
    const modal = document.getElementById('modalConfigurarEvento');
    if (modal) {
        modal.classList.remove('show');
    }
    const form = document.getElementById('formConfigurarEvento');
    if (form) {
        form.reset();
    }
    console.log('❌ Modal de evento cerrado');
}

console.log('✅ asistencia-v12.js CARGADO - Todas las funciones disponibles');
console.log('   - irAAsistencia ✅');
console.log('   - guardarConfiguracionEvento ✅');
console.log('   - cargarMiembrosParaAsistencia ✅');
console.log('   - guardarTodasAsistencias ✅');