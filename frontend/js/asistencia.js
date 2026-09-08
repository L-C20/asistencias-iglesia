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

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    const formNuevo = document.getElementById('formNuevoMiembro');
    if (formNuevo) {
        formNuevo.addEventListener('submit', guardarNuevoMiembro);
    }
    
    // Cargar conteos
    setTimeout(() => {
        cargarConteosMiembros();
    }, 500);
});

// ===== CARGAR CONTEOS =====
async function cargarConteosMiembros() {
    try {
        const respCoro = await fetch(`${API_URL}/asistencia/miembros/coro`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const miembrosCoro = await respCoro.json();
        document.getElementById('coroCount').textContent = `${miembrosCoro.length} integrantes`;

        const respOrquesta = await fetch(`${API_URL}/asistencia/miembros/orquesta`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const miembrosOrquesta = await respOrquesta.json();
        document.getElementById('orquestaCount').textContent = `${miembrosOrquesta.length} integrantes`;
    } catch (error) {
        console.error('Error cargando conteos:', error);
    }
}

// ===== IR A ASISTENCIA =====
function irAAsistencia(grupo) {
    grupoActual = grupo;
    const grupoNombre = grupo.charAt(0).toUpperCase() + grupo.slice(1);
    document.getElementById('asistenciaTitle').textContent = `Registrar Asistencia - ${grupoNombre}`;
    cambiarTab('asistencia');
    
    // Cargar fecha actual
    document.getElementById('fechaEvento').valueAsDate = new Date();
    
    // Cargar miembros
    cargarMiembrosParaAsistencia(grupo);
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
        container.innerHTML = '';
        
        if (miembros.length === 0) {
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
                        <input type="checkbox" onchange="registrarAsistenciaDirecto(${miembro.id}, '${grupo}', 'presente', this)">
                        <span class="toggle-icon">✓</span>
                        <span class="toggle-label">P</span>
                    </label>
                    <label class="toggle-switch ausente" title="Ausente">
                        <input type="checkbox" onchange="registrarAsistenciaDirecto(${miembro.id}, '${grupo}', 'ausente', this)">
                        <span class="toggle-icon">✗</span>
                        <span class="toggle-label">A</span>
                    </label>
                    <label class="toggle-switch justificado" title="Justificado">
                        <input type="checkbox" onchange="registrarAsistenciaDirecto(${miembro.id}, '${grupo}', 'justificado', this)">
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

// ===== REGISTRAR ASISTENCIA DIRECTO =====
async function registrarAsistenciaDirecto(miembroId, grupo, tipo, checkbox) {
    // Desmarcar otros checkboxes de la misma fila
    const row = checkbox.closest('.miembro-row');
    const switches = row.querySelectorAll('.toggle-switch input');
    
    switches.forEach(sw => {
        if (sw !== checkbox) sw.checked = false;
    });
    
    // Si está desmarcando, no hacer nada
    if (!checkbox.checked) {
        return;
    }
    
    const fecha = document.getElementById('fechaEvento').value;
    const tipoEvento = document.getElementById('tipoEvento').value;
    
    // Determinar si presente y nota
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
    
    // Agregar animación de guardando
    const label = checkbox.closest('.toggle-switch');
    label.classList.add('saving');
    
    try {
        const response = await fetch(`${API_URL}/asistencia/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                miembro_id: miembroId,
                tipo_evento: tipoEvento,
                fecha: fecha,
                presente: presente,
                nota: nota
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarToast('Asistencia registrada', 'success');
            label.classList.remove('saving');
        } else {
            checkbox.checked = false;
            mostrarError(data.error || 'Error al registrar');
            label.classList.remove('saving');
        }
    } catch (error) {
        console.error('Error:', error);
        checkbox.checked = false;
        mostrarError('Error al registrar asistencia');
        label.classList.remove('saving');
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

// ===== REPORTES =====
async function cargarReporteGrupo(grupo) {
    try {
        // Actualizar tabs activos
        document.querySelectorAll('.reporte-tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const response = await fetch(`${API_URL}/reportes/estadisticas/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const estadisticas = await response.json();
        const contenido = document.getElementById('reporteContent');
        
        // Calcular totales
        let totalRegistros = 0;
        let totalPresentes = 0;
        estadisticas.forEach(e => {
            totalRegistros += parseInt(e.total_registros);
            totalPresentes += parseInt(e.presentes);
        });
        
        const porcentajeGeneral = totalRegistros > 0 ? (totalPresentes / totalRegistros * 100).toFixed(1) : 0;
        
        // Gráfico
        const meses = estadisticas.map(e => e.mes.split('T')[0]);
        const porcentajes = estadisticas.map(e => parseFloat(e.porcentaje));
        
        contenido.innerHTML = `
            <div class="reporte-stats">
                <div class="stat-card">
                    <h4>Total de eventos</h4>
                    <p class="stat-number">${totalRegistros}</p>
                </div>
                <div class="stat-card">
                    <h4>Asistencias</h4>
                    <p class="stat-number">${totalPresentes}</p>
                </div>
                <div class="stat-card">
                    <h4>Porcentaje general</h4>
                    <p class="stat-number">${porcentajeGeneral}%</p>
                </div>
            </div>
            
            <div class="chart-container">
                <canvas id="graficoReporte"></canvas>
            </div>
            
            <h3 style="color: var(--primary); margin-top: 30px;">Detalle por mes</h3>
            <table class="tabla-reportes">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Eventos</th>
                        <th>Presentes</th>
                        <th>Ausentes</th>
                        <th>% Asistencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${estadisticas.map(e => `
                        <tr>
                            <td>${e.mes}</td>
                            <td>${e.total_registros}</td>
                            <td>${e.presentes}</td>
                            <td>${e.ausentes}</td>
                            <td class="porcentaje">${e.porcentaje}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Dibujar gráfico
        setTimeout(() => {
            const ctx = document.getElementById('graficoReporte');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: meses,
                        datasets: [{
                            label: '% Asistencia',
                            data: porcentajes,
                            borderColor: '#4a90e2',
                            backgroundColor: 'rgba(74, 144, 226, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100
                            }
                        }
                    }
                });
            }
        }, 100);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar reportes');
    }
}