// ===== INICIALIZAR REPORTES =====
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        cargarReporteGrupo('coro', true);
    }, 500);
});

// ===== CARGAR REPORTE GRUPO =====
async function cargarReporteGrupo(grupo, esInicial = false) {
    try {
        const contenido = document.getElementById('reporteContent');
        
        if (!esInicial) {
            contenido.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">Cargando reportes...</div>';
        }
        
        // Actualizar tabs activos
        document.querySelectorAll('.reporte-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const btnActivo = Array.from(document.querySelectorAll('.reporte-tab-btn')).find(btn => {
            return btn.textContent.toLowerCase().includes(grupo.toLowerCase());
        });
        if (btnActivo) {
            btnActivo.classList.add('active');
        }
        
        const response = await fetch(`${API_URL}/reportes/estadisticas/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const estadisticas = await response.json();
        
        if (!estadisticas || estadisticas.length === 0) {
            contenido.innerHTML = `
                <div style="background: var(--light); padding: 40px; border-radius: 12px; text-align: center;">
                    <p style="color: var(--text-light); margin: 0;">No hay datos de asistencia registrados para ${grupo}</p>
                </div>
            `;
            return;
        }
        
        // Calcular totales
        let totalRegistros = 0;
        let totalPresentes = 0;
        let totalAusentes = 0;
        estadisticas.forEach(e => {
            totalRegistros += parseInt(e.total_registros || 0);
            totalPresentes += parseInt(e.presentes || 0);
            totalAusentes += parseInt(e.ausentes || 0);
        });
        
        const porcentajeGeneral = totalRegistros > 0 ? (totalPresentes / totalRegistros * 100).toFixed(1) : 0;
        
        const meses = estadisticas.map(e => e.mes.split('T')[0]);
        const porcentajes = estadisticas.map(e => parseFloat(e.porcentaje || 0));
        
        contenido.innerHTML = `
            <div class="reporte-stats" id="statsContainer">
                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Eventos Registrados</h4>
                        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <p class="stat-number">${totalRegistros}</p>
                    <p class="stat-detail">Total de eventos</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Asistencias</h4>
                        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <p class="stat-number">${totalPresentes}</p>
                    <p class="stat-detail">Miembros presentes</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Ausencias</h4>
                        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 18c0 1 1 2 2 2h8c1 0 2-1 2-2"></path>
                            <path d="M9 9h6"></path>
                            <path d="M9 13h6"></path>
                            <circle cx="12" cy="12" r="9"></circle>
                        </svg>
                    </div>
                    <p class="stat-number">${totalAusentes}</p>
                    <p class="stat-detail">Miembros ausentes</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Porcentaje General</h4>
                        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v20"></path>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </div>
                    <p class="stat-number">${porcentajeGeneral}%</p>
                    <p class="stat-detail">Asistencia promedio</p>
                </div>
            </div>
            <div class="reporte-graficos">
                <div class="grafico-contenedor">
                    <h3>Asistencia por Mes</h3>
                    <canvas id="graficoLinea" height="300"></canvas>
                </div>
                <div class="grafico-contenedor">
                    <h3>Distribución</h3>
                    <canvas id="graficoPie" height="300"></canvas>
                </div>
            </div>
            <div class="reporte-filtros">
                <h3>Detalles por Integrante</h3>
                <div class="filtros-row">
                    <div class="filtro-group">
                        <label>Tipo de Evento:</label>
                        <select id="filtroTipoEvento" onchange="aplicarFiltrosTabla('${grupo}')">
                            <option value="todos">Todos</option>
                            <option value="santo_culto">Santo Culto</option>
                            <option value="ensayo">Ensayo</option>
                        </select>
                    </div>
                    <div class="filtro-group">
                        <label>Desde:</label>
                        <input type="date" id="filtroFechaInicio" onchange="aplicarFiltrosTabla('${grupo}')">
                    </div>
                    <div class="filtro-group">
                        <label>Hasta:</label>
                        <input type="date" id="filtroFechaFin" onchange="aplicarFiltrosTabla('${grupo}')">
                    </div>
                    <div class="filtro-group">
                        <button class="btn btn-secondary" onclick="limpiarFiltrosTabla('${grupo}')">Limpiar</button>
                    </div>
                </div>
            </div>
            <div id="tablaIntegrantes" class="tabla-integrantes"></div>
        `;
        
        // Dibujar gráficos
        setTimeout(() => {
            dibujarGraficoLinea(meses, porcentajes);
            dibujarGraficoPie(totalPresentes, totalAusentes);
        }, 100);
        
        // Cargar tabla
        setTimeout(() => {
            cargarTablaIntegrantesExpandible(grupo, 'todos', null, null);
        }, 200);
        
    } catch (error) {
        console.error('Error al cargar reporte:', error);
        const contenido = document.getElementById('reporteContent');
        if (contenido) {
            contenido.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;">Error al cargar datos</div>';
        }
    }
}

// ===== DIBUJAR GRÁFICO LÍNEA =====
function dibujarGraficoLinea(labels, data) {
    const canvas = document.getElementById('graficoLinea');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.chartLineInstance) {
        window.chartLineInstance.destroy();
    }
    
    window.chartLineInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Porcentaje Asistencia',
                data: data,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#4a90e2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
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

// ===== DIBUJAR GRÁFICO PIE =====
function dibujarGraficoPie(presentes, ausentes) {
    const canvas = document.getElementById('graficoPie');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.chartPieInstance) {
        window.chartPieInstance.destroy();
    }
    
    window.chartPieInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Presentes', 'Ausentes'],
            datasets: [{
                data: [presentes, ausentes],
                backgroundColor: ['#26a69a', '#e74c3c'],
                borderColor: ['#00b8a9', '#c0392b'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// ===== CARGAR TABLA INTEGRANTES EXPANDIBLE =====
async function cargarTablaIntegrantesExpandible(grupo, tipoEvento = 'todos', fechaInicio = null, fechaFin = null) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const miembros = await response.json();
        const container = document.getElementById('tablaIntegrantes');
        
        if (!container || !miembros || miembros.length === 0) {
            if (container) {
                container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-light);">No hay integrantes registrados</div>';
            }
            return;
        }
        
        // Limpiar contenedor COMPLETAMENTE
        container.innerHTML = '';
        
        // Crear filas para cada miembro
        for (const miembro of miembros) {
            try {
                let url = `${API_URL}/reportes/por-miembro/${miembro.id}?tipo_evento=${tipoEvento}`;
                if (fechaInicio) url += `&fecha_inicio=${fechaInicio}`;
                if (fechaFin) url += `&fecha_fin=${fechaFin}`;
                
                const respAsistencia = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                let datosAsistencia = {
                    total: 0,
                    presentes: 0,
                    ausentes: 0,
                    justificados: 0,
                    eventos: []
                };
                
                if (respAsistencia.ok) {
                    datosAsistencia = await respAsistencia.json();
                }
                
                const totalEventos = datosAsistencia.total || 0;
                const presentes = datosAsistencia.presentes || 0;
                const ausentes = datosAsistencia.ausentes || 0;
                const justificados = datosAsistencia.justificados || 0;
                const porcentaje = totalEventos > 0 ? (presentes / totalEventos * 100).toFixed(1) : 0;
                
                const detalleExtra = grupo === 'coro' ? (miembro.voz || '—') : (miembro.instrumento || '—');
                
                // ID ÚNICO para cada miembro
                const filaId = `fila-expandible-${grupo}-${miembro.id}`;
                const contenidoId = `contenido-expandible-${grupo}-${miembro.id}`;
                
                const rowDiv = document.createElement('div');
                rowDiv.className = 'fila-expandible';
                rowDiv.id = filaId;
                rowDiv.setAttribute('data-miembro-id', miembro.id);
                
                // Crear contenido HTML
                const headerHTML = `
                    <div class="fila-header" onclick="toggleExpandibleFila('${filaId}', '${contenidoId}'); return false;">
                        <div class="fila-toggle">
                            <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                        <div class="fila-info">
                            <span class="nombre-celda">${miembro.nombre}</span>
                            <span class="detalle-celda">${detalleExtra}</span>
                        </div>
                        <div class="fila-stats">
                            <span class="badge badge-info">${totalEventos} eventos</span>
                            <span class="badge badge-success">${presentes} ✓</span>
                            <span class="badge badge-danger">${ausentes} ✗</span>
                            ${justificados > 0 ? `<span class="badge badge-warning">${justificados} J</span>` : ''}
                        </div>
                        <div class="fila-porcentaje">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${porcentaje}%"></div>
                                <span class="progress-text">${porcentaje}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="fila-content" id="${contenidoId}">
                        <div class="eventos-lista">
                            ${datosAsistencia.eventos && datosAsistencia.eventos.length > 0 ? 
                                datosAsistencia.eventos.map(evento => `
                                    <div class="evento-item">
                                        <div class="evento-fecha">
                                            <span class="fecha-label">${new Date(evento.fecha).toLocaleDateString('es-ES')}</span>
                                        </div>
                                        <div class="evento-info">
                                            <span class="tipo-evento">${evento.tipo_evento === 'santo_culto' ? '⛪ Santo Culto' : '🎼 Ensayo'}</span>
                                        </div>
                                        <div class="evento-estado">
                                            ${evento.presente === true ? 
                                                '<span class="estado-presente">Presente</span>' :
                                                evento.presente === false ? 
                                                '<span class="estado-ausente">Ausente</span>' :
                                                '<span class="estado-justificado">Justificado</span>'
                                            }
                                        </div>
                                    </div>
                                `).join('')
                                : '<div style="padding: 16px; text-align: center; color: var(--text-light);">Sin eventos registrados</div>'
                            }
                        </div>
                    </div>
                `;
                
                rowDiv.innerHTML = headerHTML;
                container.appendChild(rowDiv);
                
            } catch (err) {
                console.error('Error cargando datos del miembro:', err);
            }
        }
        
    } catch (error) {
        console.error('Error al cargar tabla integrantes:', error);
        const container = document.getElementById('tablaIntegrantes');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error al cargar datos</div>';
        }
    }
}

// ===== TOGGLE EXPANDIBLE - VERSIÓN MEJORADA =====
function toggleExpandibleFila(filaId, contenidoId) {
    console.log('Toggle:', { filaId, contenidoId });
    
    const fila = document.getElementById(filaId);
    const contenido = document.getElementById(contenidoId);
    
    if (!fila || !contenido) {
        console.error('No encontrados:', { fila: !!fila, contenido: !!contenido });
        return;
    }
    
    fila.classList.toggle('expanded');
    console.log('Estado expandido:', fila.classList.contains('expanded'));
}

// ===== APLICAR FILTROS =====
async function aplicarFiltrosTabla(grupo) {
    const fechaInicio = document.getElementById('filtroFechaInicio')?.value;
    const fechaFin = document.getElementById('filtroFechaFin')?.value;
    const tipoEvento = document.getElementById('filtroTipoEvento')?.value || 'todos';
    
    await cargarTablaIntegrantesExpandible(grupo, tipoEvento, fechaInicio, fechaFin);
}

// ===== LIMPIAR FILTROS =====
async function limpiarFiltrosTabla(grupo) {
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    document.getElementById('filtroTipoEvento').value = 'todos';
    
    await cargarTablaIntegrantesExpandible(grupo, 'todos', null, null);
}

console.log('✅ reportes-v11.js cargado');