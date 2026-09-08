// ===== INICIALIZAR REPORTES =====
document.addEventListener('DOMContentLoaded', () => {
    // Cargar reportes de coro por defecto cuando se abre la app
    setTimeout(() => {
        cargarReporteGrupo('coro', true);
    }, 500);
});

// ===== CARGAR REPORTE GRUPO =====
async function cargarReporteGrupo(grupo, esInicial = false) {
    try {
        const contenido = document.getElementById('reporteContent');
        
        // Mostrar estado de carga
        if (!esInicial) {
            contenido.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);">Cargando reportes...</div>';
        }
        
        // Actualizar tabs activos
        document.querySelectorAll('.reporte-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Marcar el botón activo
        const btnActivo = Array.from(document.querySelectorAll('.reporte-tab-btn')).find(btn => {
            return btn.textContent.toLowerCase().includes(grupo.toLowerCase());
        });
        if (btnActivo) {
            btnActivo.classList.add('active');
        }
        
        // Obtener estadísticas
        const response = await fetch(`${API_URL}/reportes/estadisticas/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const estadisticas = await response.json();
        
        // Validar que haya datos
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
        
        // Gráfico
        const meses = estadisticas.map(e => e.mes.split('T')[0]);
        const porcentajes = estadisticas.map(e => parseFloat(e.porcentaje || 0));
        
        contenido.innerHTML = `
            <div class="reporte-stats">
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
                        <h4>% Asistencia</h4>
                        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </div>
                    <p class="stat-number">${porcentajeGeneral}%</p>
                    <p class="stat-detail">Porcentaje general</p>
                </div>
            </div>
            
            <div class="graficos-container">
                <div class="grafico-card">
                    <h3>Tendencia de Asistencia</h3>
                    <div class="chart-container">
                        <canvas id="graficoLinea"></canvas>
                    </div>
                </div>
                
                <div class="grafico-card">
                    <h3>Desglose Presente vs Ausente</h3>
                    <div class="chart-container-small">
                        <canvas id="graficoPie"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="filtros-tabla">
                <h3>Detalle de Integrantes</h3>
                <div class="filtros-buttons">
                    <button class="filter-btn active" onclick="filtrarTablaReporte('${grupo}', 'todos')">Todos</button>
                    <button class="filter-btn" onclick="filtrarTablaReporte('${grupo}', 'santo_culto')">Santo Culto</button>
                    <button class="filter-btn" onclick="filtrarTablaReporte('${grupo}', 'ensayo')">Ensayo</button>
                </div>
            </div>
            
            <table class="tabla-reportes" id="tablaIntegrantes">
                <thead>
                    <tr>
                        <th>Miembro</th>
                        <th>Detalle</th>
                        <th>Eventos</th>
                        <th>Presentes</th>
                        <th>Ausentes</th>
                        <th>% Asistencia</th>
                    </tr>
                </thead>
                <tbody id="tablaIntegrantesBody">
                    <tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando datos...</td></tr>
                </tbody>
            </table>
        `;
        
        // Dibujar gráficos
        setTimeout(() => {
            dibujarGraficoLinea(meses, porcentajes);
            dibujarGraficoPie(totalPresentes, totalAusentes);
            cargarTablaIntegrantes(grupo, 'todos');
        }, 100);
        
    } catch (error) {
        console.error('Error en reportes:', error);
        const contenido = document.getElementById('reporteContent');
        if (contenido) {
            contenido.innerHTML = `
                <div style="background: #fee2e2; padding: 20px; border-radius: 12px; border-left: 4px solid #e74c3c;">
                    <p style="color: #e74c3c; margin: 0; font-weight: 600;">Error al cargar reportes</p>
                    <p style="color: #c53030; margin: 5px 0 0 0; font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
        mostrarError('Error al cargar reportes');
    }
}

// ===== DIBUJAR GRÁFICO LÍNEA =====
function dibujarGraficoLinea(meses, porcentajes) {
    const ctx = document.getElementById('graficoLinea');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (window.graficoLineaInstance) {
        window.graficoLineaInstance.destroy();
    }
    
    window.graficoLineaInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: '% Asistencia',
                data: porcentajes,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4a90e2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// ===== DIBUJAR GRÁFICO PIE =====
function dibujarGraficoPie(presentes, ausentes) {
    const ctx = document.getElementById('graficoPie');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (window.graficoPieInstance) {
        window.graficoPieInstance.destroy();
    }
    
    window.graficoPieInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Presentes', 'Ausentes'],
            datasets: [{
                data: [presentes, ausentes],
                backgroundColor: ['#26a69a', '#e74c3c'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            }
        }
    });
}

// ===== CARGAR TABLA INTEGRANTES =====
async function cargarTablaIntegrantes(grupo, tipoEvento) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const miembros = await response.json();
        const tbody = document.getElementById('tablaIntegrantesBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!miembros || miembros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay miembros registrados</td></tr>';
            return;
        }
        
        // Obtener datos de asistencia para cada miembro
        for (const miembro of miembros) {
            try {
                const url = `${API_URL}/reportes/por-miembro/${miembro.id}?tipo_evento=${tipoEvento}`;
                const respAsistencia = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                let datosAsistencia = {};
                if (respAsistencia.ok) {
                    datosAsistencia = await respAsistencia.json();
                }
                
                const totalEventos = datosAsistencia.total || 0;
                const presentes = datosAsistencia.presentes || 0;
                const ausentes = datosAsistencia.ausentes || 0;
                const porcentaje = totalEventos > 0 ? (presentes / totalEventos * 100).toFixed(1) : 0;
                
                const detalleExtra = grupo === 'coro' ? (miembro.voz || '—') : (miembro.instrumento || '—');
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="nombre-celda">${miembro.nombre}</td>
                    <td>${detalleExtra}</td>
                    <td><span class="badge badge-info">${totalEventos}</span></td>
                    <td><span class="badge badge-success">${presentes}</span></td>
                    <td><span class="badge badge-danger">${ausentes}</span></td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${porcentaje}%"></div>
                            <span class="progress-text">${porcentaje}%</span>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            } catch (err) {
                console.error('Error cargando datos del miembro:', err);
                // Continuar con el siguiente miembro
            }
        }
        
    } catch (error) {
        console.error('Error al cargar tabla integrantes:', error);
        const tbody = document.getElementById('tablaIntegrantesBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #e74c3c;">Error al cargar datos</td></tr>';
        }
    }
}

// ===== FILTRAR TABLA =====
async function filtrarTablaReporte(grupo, tipoEvento) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Encontrar el botón correcto
    const botones = document.querySelectorAll('.filter-btn');
    botones.forEach(btn => {
        if (tipoEvento === 'todos' && btn.textContent === 'Todos') {
            btn.classList.add('active');
        } else if (tipoEvento === 'santo_culto' && btn.textContent === 'Santo Culto') {
            btn.classList.add('active');
        } else if (tipoEvento === 'ensayo' && btn.textContent === 'Ensayo') {
            btn.classList.add('active');
        }
    });
    
    // Cargar tabla filtrada
    await cargarTablaIntegrantes(grupo, tipoEvento);
}