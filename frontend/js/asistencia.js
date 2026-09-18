// Variables globales
var miembrosActuales = [];
var grupoActual = null;
var asistenciasParaGuardar = {};
var tipoEventoAsistencia = null;
var fechaEventoActual = null;

console.log('🚀 asistencia-v12.js iniciando');

// ===== IR A ASISTENCIA =====
function irAAsistencia(grupo) {
    console.log('═══════════════════════════════════════');
    console.log('🔄 [irAAsistencia] Iniciando - Grupo:', grupo);
    console.log('═══════════════════════════════════════');
    
    // Verificar que grupo sea válido
    if (grupo !== 'orquesta') {
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
    
    tipoEventoAsistencia = tipoEvento;
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

        // Cada evento arranca limpio: lo guardado en la base, y encima el borrador local si lo hay
        asistenciasParaGuardar = {};
        await cargarRegistrosExistentes(grupo);
        const borrador = leerBorrador();
        if (borrador) {
            Object.assign(asistenciasParaGuardar, borrador);
            mostrarToast('Se recuperó lo que habías marcado sin guardar', 'info');
        }

        mostrarEncabezadoEvento();
        renderizarListaAsistencia(grupo);
        cambiarTab('asistencia-' + grupo);
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarError('Error al cargar miembros');
    }
}

// ===== BORRADOR LOCAL =====
// Lo marcado se guarda en el teléfono por evento y fecha, para retomar
// aunque se cierre la app sin tocar Guardar.
function claveBorrador() {
    return `borrador-asistencia:${tipoEventoAsistencia}:${fechaEventoActual}`;
}

function guardarBorrador() {
    try {
        const marcados = Object.fromEntries(
            Object.entries(asistenciasParaGuardar).filter(([, a]) => a.presente === true || a.presente === false)
        );
        if (Object.keys(marcados).length) localStorage.setItem(claveBorrador(), JSON.stringify(marcados));
        else localStorage.removeItem(claveBorrador());
    } catch (e) { /* sin almacenamiento disponible: se sigue sin borrador */ }
}

function leerBorrador() {
    try {
        const raw = localStorage.getItem(claveBorrador());
        const datos = raw ? JSON.parse(raw) : null;
        return datos && Object.keys(datos).length ? datos : null;
    } catch (e) { return null; }
}

function borrarBorrador() {
    try { localStorage.removeItem(claveBorrador()); } catch (e) { /* nada */ }
}

// ===== ENCABEZADO: QUÉ EVENTO Y QUÉ DÍA SE ESTÁ REGISTRANDO =====
function mostrarEncabezadoEvento() {
    const nombres = { santo_culto: 'Santo Culto', ensayo: 'Ensayo', bautismo: 'Bautismo' };
    const titulo = document.getElementById('tituloAsistencia');
    const sub = document.getElementById('fechaAsistencia');
    if (titulo) titulo.textContent = nombres[tipoEventoAsistencia] || 'Asistencia';
    if (sub && fechaEventoActual) {
        const f = new Date(fechaEventoActual + 'T00:00:00');
        const texto = f.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        sub.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
    }
}

// ===== CARGAR REGISTROS EXISTENTES =====
async function cargarRegistrosExistentes(grupo) {
    try {
        const url = `${API_URL}/asistencia/${grupo}/${fechaEventoActual}/${tipoEventoAsistencia}`;
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
                    justificado: reg.justificado || false,
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
    
    const containerId = 'listaMiembrosAsistenciaOrquesta';
    const container = document.getElementById(containerId);
    
    console.log('🔍 Contenedor ID:', containerId);
    console.log('   Encontrado:', container ? '✅' : '❌');
    
    if (!container) {
        console.error('❌ Contenedor no encontrado:', containerId);
        return;
    }
    
    container.innerHTML = '';

    if (miembrosActuales.length === 0) {
        container.innerHTML = '<p class="lista-vacia">No hay integrantes en este grupo</p>';
        return;
    }

    // Agrupar por instrumento, en el orden de la orquesta
    const porInstrumento = {};
    miembrosActuales.forEach(m => {
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

        const cabecera = document.createElement('summary');
        cabecera.className = 'seccion-cabecera';
        cabecera.innerHTML = `
            <svg class="seccion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span class="seccion-nombre">${instrumento}</span>
            <span class="seccion-contador"><b>0</b> / ${porInstrumento[instrumento].length}</span>
        `;

        const cuerpo = document.createElement('div');
        cuerpo.className = 'seccion-cuerpo';

        porInstrumento[instrumento].forEach(miembro => cuerpo.appendChild(crearFilaMiembro(miembro)));

        seccion.append(cabecera, cuerpo);
        container.appendChild(seccion);
        actualizarContadorSeccion(seccion);
    });

    console.log('✅ Lista renderizada con', miembrosActuales.length, 'miembros en', orden.length, 'secciones');
}

function crearFilaMiembro(miembro) {
        const registro = asistenciasParaGuardar[miembro.id] || { presente: null, justificado: false, nota: '' };

        const miembroDiv = document.createElement('div');
        miembroDiv.className = 'miembro-row';
        miembroDiv.id = `asistencia-${miembro.id}`;

        const esPresente = registro.presente === true && !registro.justificado;
        const esAusente = registro.presente === false && !registro.justificado;
        const esJustificado = !!registro.justificado;

        miembroDiv.innerHTML = `
            <div class="miembro-info">
                <div class="miembro-nombre">${miembro.nombre}</div>
            </div>
            <div class="miembro-switches">
                <label class="toggle-switch presente ${esPresente ? 'on' : ''}">
                    <input type="radio" name="asistencia-${miembro.id}" value="present"
                        onchange="cambiarAsistencia(this)" ${esPresente ? 'checked' : ''} />
                    <span class="toggle-icon">P</span>
                    <span class="toggle-label">Presente</span>
                </label>
                <label class="toggle-switch ausente ${esAusente ? 'on' : ''}">
                    <input type="radio" name="asistencia-${miembro.id}" value="absent"
                        onchange="cambiarAsistencia(this)" ${esAusente ? 'checked' : ''} />
                    <span class="toggle-icon">A</span>
                    <span class="toggle-label">Ausente</span>
                </label>
                <label class="toggle-switch justificado ${esJustificado ? 'on' : ''}">
                    <input type="radio" name="asistencia-${miembro.id}" value="justified"
                        onchange="cambiarAsistencia(this)" ${esJustificado ? 'checked' : ''} />
                    <span class="toggle-icon">AJ</span>
                    <span class="toggle-label">Justificado</span>
                </label>
            </div>
        `;

        return miembroDiv;
}

// Cuántos integrantes de la sección ya tienen algo marcado
function actualizarContadorSeccion(seccion) {
    const filas = seccion.querySelectorAll('.miembro-row');
    const marcados = [...filas].filter(f => f.querySelector('input:checked')).length;
    const contador = seccion.querySelector('.seccion-contador b');
    if (contador) contador.textContent = marcados;
    seccion.classList.toggle('completa', filas.length > 0 && marcados === filas.length);
}

function expandirTodo(abrir) {
    document.querySelectorAll('.seccion-instrumento').forEach(s => { s.open = abrir; });
}

// ===== CAMBIAR ASISTENCIA =====
function cambiarAsistencia(checkbox) {
    const name = checkbox.name; // "asistencia-{miembro_id}"
    const miembroId = parseInt(name.split('-')[1]);

    const presente = checkbox.value === 'present';
    const justificado = checkbox.value === 'justified';

    asistenciasParaGuardar[miembroId] = {
        presente: presente,
        justificado: justificado,
        nota: asistenciasParaGuardar[miembroId]?.nota || ''
    };

    // Respaldo del resaltado para navegadores sin soporte de :has()
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        const toggle = input.closest('.toggle-switch');
        if (toggle) toggle.classList.toggle('on', input.checked);
    });

    const seccion = checkbox.closest('.seccion-instrumento');
    if (seccion) actualizarContadorSeccion(seccion);

    guardarBorrador();

    console.log('✏️ Asistencia actualizada:', { miembroId, presente, justificado });
}

// ===== GUARDAR TODAS LAS ASISTENCIAS =====
let guardandoAsistencias = false;

async function guardarTodasAsistencias() {
    if (guardandoAsistencias) return;

    const registros = Object.entries(asistenciasParaGuardar)
        .filter(([, a]) => a.presente === true || a.presente === false)
        .map(([miembroId, a]) => ({
            miembro_id: parseInt(miembroId),
            presente: a.presente,
            justificado: a.justificado || false,
            nota: a.nota || null
        }));

    if (registros.length === 0) {
        mostrarError('Marcá al menos una asistencia');
        return;
    }

    const boton = document.querySelector('#asistencia-orquesta .tab-footer .btn');
    const textoOriginal = boton ? boton.innerHTML : '';
    guardandoAsistencias = true;
    if (boton) {
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Guardando…';
    }

    try {
        const response = await fetch(`${API_URL}/asistencia/registrar-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ tipo_evento: tipoEventoAsistencia, fecha: fechaEventoActual, registros })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);

        mostrarToast(`${data.guardados} asistencias guardadas`, 'success');
        borrarBorrador();
        limpiarAsistencia();
        cambiarTab('inicio');
    } catch (error) {
        console.error('❌ Error guardando asistencias:', error);
        mostrarError('No se pudieron guardar las asistencias. Intentá de nuevo.');
    } finally {
        guardandoAsistencias = false;
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }
}

// ===== LIMPIAR ASISTENCIA =====
function limpiarAsistencia() {
    miembrosActuales = [];
    grupoActual = null;
    asistenciasParaGuardar = {};
    tipoEventoAsistencia = null;
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