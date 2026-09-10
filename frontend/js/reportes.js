// ===== VARIABLES GLOBALES =====
let currentGrupo = 'coro';

console.log('🚀 reportes-v13.js iniciando');

// ===== CARGAR REPORTE GRUPO =====
async function cargarReporteGrupo(grupo, esInicial = false) {
    currentGrupo = grupo;
    
    try {
        console.log('═══════════════════════════════════════');
        console.log('🔄 [cargarReporteGrupo] Cargando para:', grupo);
        console.log('═══════════════════════════════════════');
        
        // Actualizar tabs activos
        document.querySelectorAll('.reporte-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const btnActivo = Array.from(document.querySelectorAll('.reporte-tab-btn')).find(btn => {
            return btn.textContent.toLowerCase().includes(grupo.toLowerCase());
        });
        if (btnActivo) {
            btnActivo.classList.add('active');
            console.log('✅ Tab activado:', grupo);
        }
        
        const url = `${API_URL}/reportes/estadisticas/${grupo}`;
        console.log('📡 Fetch a:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            console.warn('⚠️ Error en response:', response.status);
            // Mostrar mensaje de error pero no bloquear
            const contenido = document.getElementById('reporteContent');
            if (contenido) {
                contenido.innerHTML = `<div style="background: var(--light); padding: 40px; border-radius: 12px; text-align: center; color: var(--text-light);">
                    <p>No hay datos de asistencia registrados para <strong>${grupo}</strong></p>
                    <p style="font-size: 12px;">Registra asistencia para ver reportes aquí</p>
                </div>`;
            }
            return;
        }
        
        const estadisticas = await response.json();
        console.log('📋 Datos recibidos:', estadisticas.length, 'miembros');
        
        if (!estadisticas || estadisticas.length === 0) {
            console.log('ℹ️ Sin datos de asistencia');
            const contenido = document.getElementById('reporteContent');
            if (contenido) {
                contenido.innerHTML = `<div style="background: var(--light); padding: 40px; border-radius: 12px; text-align: center; color: var(--text-light);">
                    <p>No hay datos de asistencia registrados para <strong>${grupo}</strong></p>
                    <p style="font-size: 12px;">Registra asistencia para ver reportes aquí</p>
                </div>`;
            }
            return;
        }
        
        // Calcular totales
        let totalRegistros = 0;
        let totalPresentes = 0;
        let totalAusentes = 0;
        let totalJustificados = 0;
        
        estadisticas.forEach(e => {
            totalRegistros += parseInt(e.total_registros || 0);
            totalPresentes += parseInt(e.presentes || 0);
            totalAusentes += parseInt(e.ausentes || 0);
            totalJustificados += parseInt(e.justificados || 0);
        });
        
        console.log('📊 Totales:', { totalRegistros, totalPresentes, totalAusentes, totalJustificados });
        
        const porcentajeGeneral = totalRegistros > 0 ? (totalPresentes / totalRegistros * 100).toFixed(1) : 0;
        
        // Generar HTML de reportes
        let html = `
            <div class="reporte-stats" id="statsContainer">
                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Total Registros</h4>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number">${totalRegistros}</div>
                        <div class="stat-detail">eventos registrados</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Presentes</h4>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #10b981;">${totalPresentes}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalPresentes / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Ausentes</h4>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #ef4444;">${totalAusentes}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalAusentes / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <h4>Justificados</h4>
                    </div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #f59e0b;">${totalJustificados}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalJustificados / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>
            </div>

            <div class="reporte-graficos">
                <div class="grafico-contenedor">
                    <h3>Distribución General</h3>
                    <canvas id="graficoPie" height="250"></canvas>
                </div>
            </div>

            <div class="tabla-integrantes">
                <h3>Detalles por Integrante</h3>
                ${estadisticas.map((miembro, idx) => `
                    <div class="fila-expandible" id="fila-expandible-${grupo}-${miembro.miembro_id}-${idx}">
                        <div class="fila-header">
                            <button class="fila-toggle" type="button" onclick="toggleExpandibleFila('fila-expandible-${grupo}-${miembro.miembro_id}-${idx}'); return false;">
                                <span class="toggle-icon">▶</span>
                            </button>
                            <div class="fila-info">
                                <div class="nombre-celda"><strong>${miembro.nombre}</strong></div>
                                <div class="detalle-celda">${grupo === 'coro' ? (miembro.voz || 'Sin asignar') : (miembro.instrumento || 'Sin asignar')}</div>
                            </div>
                            <div class="fila-porcentaje">
                                <div class="progress-bar" style="width: 100%; height: 24px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                                    <div class="progress-fill" style="width: ${miembro.total_registros > 0 ? ((miembro.presentes / miembro.total_registros * 100)) : 0}%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); display: flex; align-items: center; justify-content: center;">
                                        <span class="progress-text" style="font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${miembro.total_registros > 0 ? ((miembro.presentes / miembro.total_registros * 100).toFixed(0)) : 0}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="fila-content" style="display: none; padding: 16px; border-top: 1px solid var(--border);">
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div>
                                    <div style="font-size: 12px; color: var(--text-light); margin-bottom: 4px;">Total Registros</div>
                                    <div style="font-size: 18px; font-weight: 600; color: var(--primary);">${miembro.total_registros}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-light); margin-bottom: 4px;">Presentes</div>
                                    <div style="font-size: 18px; font-weight: 600; color: #10b981;">${miembro.presentes}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: var(--text-light); margin-bottom: 4px;">Ausentes</div>
                                    <div style="font-size: 18px; font-weight: 600; color: #ef4444;">${miembro.ausentes}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        const contenido = document.getElementById('reporteContent');
        if (contenido) {
            contenido.innerHTML = html;
            console.log('✅ Reportes renderizados');
        }
        
        // Dibujar gráfico pie
        setTimeout(() => {
            dibujarGraficoPie(grupo, totalPresentes, totalAusentes, totalJustificados);
        }, 100);
        
    } catch (error) {
        console.error('❌ Error en cargarReporteGrupo:', error);
        const contenido = document.getElementById('reporteContent');
        if (contenido) {
            contenido.innerHTML = `<div style="background: var(--light); padding: 40px; border-radius: 12px; text-align: center; color: #ef4444;">
                <p>❌ Error al cargar reportes</p>
                <p style="font-size: 12px;">${error.message}</p>
            </div>`;
        }
    }
}

// ===== DIBUJAR GRÁFICO PIE =====
function dibujarGraficoPie(grupo, presentes, ausentes, justificados) {
    try {
        const ctx = document.getElementById('graficoPie');
        if (!ctx) {
            console.warn('⚠️ Canvas graficoPie no encontrado');
            return;
        }
        
        const total = presentes + ausentes + justificados;
        
        if (window.pieChart) {
            window.pieChart.destroy();
        }
        
        window.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Presentes', 'Ausentes', 'Justificados'],
                datasets: [{
                    data: [presentes, ausentes, justificados],
                    backgroundColor: [
                        '#10b981',
                        '#ef4444',
                        '#f59e0b'
                    ],
                    borderColor: ['white'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        console.log('✅ Gráfico dibujado');
    } catch (error) {
        console.error('❌ Error dibujando gráfico:', error);
    }
}

// ===== TOGGLE FILA EXPANDIBLE =====
function toggleExpandibleFila(filaId) {
    const fila = document.getElementById(filaId);
    if (!fila) return;
    
    const content = fila.querySelector('.fila-content');
    const toggle = fila.querySelector('.toggle-icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
        fila.classList.add('expanded');
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
        fila.classList.remove('expanded');
    }
}

console.log('✅ reportes-v13.js CARGADO');