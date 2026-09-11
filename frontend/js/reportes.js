console.log('📊 reportes-v17.js iniciando');

// ===== VARIABLES GLOBALES =====
let currentGrupo = 'coro';
let datosActuales = [];

// ===== INICIALIZAR REPORTES AL CARGAR =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 DOM cargado, inicializando reportes...');
    setTimeout(() => {
        cargarReporteGrupo('coro', true);
    }, 500);
});

// ===== CARGAR REPORTE GRUPO =====
async function cargarReporteGrupo(grupo, esInicial = false) {
    currentGrupo = grupo;
    
    try {
        console.log('═══════════════════════════════════════');
        console.log('🔄 [cargarReporteGrupo] Cargando:', grupo);
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
            mostrarMensajeReportes(`No hay datos de asistencia para <strong>${grupo}</strong>`);
            return;
        }
        
        const estadisticas = await response.json();
        console.log('📋 Datos recibidos:', estadisticas.length, 'miembros');
        
        if (!estadisticas || estadisticas.length === 0) {
            console.log('ℹ️ Sin datos de asistencia');
            mostrarMensajeReportes(`No hay datos de asistencia para <strong>${grupo}</strong>`);
            return;
        }
        
        datosActuales = estadisticas;
        
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
        
        // Generar HTML de reportes
        let html = `
            <div class="reporte-stats">
                <div class="stat-card">
                    <div class="stat-header"><h4>Total Registros</h4></div>
                    <div class="stat-content">
                        <div class="stat-number">${totalRegistros}</div>
                        <div class="stat-detail">eventos registrados</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header"><h4>Presentes</h4></div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #10b981;">${totalPresentes}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalPresentes / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header"><h4>Ausentes</h4></div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #ef4444;">${totalAusentes}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalAusentes / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-header"><h4>Justificados</h4></div>
                    <div class="stat-content">
                        <div class="stat-number" style="color: #f59e0b;">${totalJustificados}</div>
                        <div class="stat-detail">${totalRegistros > 0 ? ((totalJustificados / totalRegistros * 100).toFixed(1)) : 0}%</div>
                    </div>
                </div>
            </div>

            <!-- TABLA CON FILTROS -->
            <div class="tabla-reportes-contenedor">
                <div class="tabla-header">
                    <h3>Detalle por Integrante</h3>
                    <div class="tabla-filtros">
                        <div class="filtro-grupo">
                            <label>Filtrar por evento:</label>
                            <select id="filtroEvento" onchange="aplicarFiltros()">
                                <option value="">Todos</option>
                                <option value="santo_culto">Santo Culto</option>
                                <option value="ensayo">Ensayo</option>
                            </select>
                        </div>
                        <div class="filtro-grupo">
                            <label>Filtrar por estado:</label>
                            <select id="filtroEstado" onchange="aplicarFiltros()">
                                <option value="">Todos</option>
                                <option value="presente">Presentes</option>
                                <option value="ausente">Ausentes</option>
                                <option value="justificado">Justificados</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="tabla-miembros">
                    <table class="tabla-datos">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>${grupo === 'coro' ? 'Voz' : 'Instrumento'}</th>
                                <th>Total Registros</th>
                                <th>Presentes</th>
                                <th>Ausentes</th>
                                <th>Justificados</th>
                                <th>% Asistencia</th>
                            </tr>
                        </thead>
                        <tbody id="tablaIntegrantesBody">
                            ${estadisticas.map(miembro => `
                                <tr class="fila-tabla" data-nombre="${miembro.nombre}" data-presentes="${miembro.presentes}" data-ausentes="${miembro.ausentes}" data-justificados="${miembro.justificados}">
                                    <td class="celda-nombre"><strong>${miembro.nombre || 'Integrante'}</strong></td>
                                    <td class="celda-detalle">${grupo === 'coro' ? (miembro.voz || 'Sin asignar') : (miembro.instrumento || 'Sin asignar')}</td>
                                    <td class="celda-numero">${miembro.total_registros || 0}</td>
                                    <td class="celda-numero"><span class="badge badge-success">${miembro.presentes || 0}</span></td>
                                    <td class="celda-numero"><span class="badge badge-danger">${miembro.ausentes || 0}</span></td>
                                    <td class="celda-numero"><span class="badge badge-warning">${miembro.justificados || 0}</span></td>
                                    <td class="celda-porcentaje">
                                        <div class="progress-bar-simple">
                                            <div class="progress-fill-simple" style="width: ${miembro.total_registros > 0 ? ((miembro.presentes / miembro.total_registros * 100)) : 0}%"></div>
                                        </div>
                                        <span class="porcentaje-texto">${miembro.total_registros > 0 ? ((miembro.presentes / miembro.total_registros * 100).toFixed(1)) : 0}%</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- GRÁFICO ABAJO -->
            <div class="reporte-graficos">
                <div class="grafico-contenedor">
                    <h3>Distribución de Asistencia</h3>
                    <div class="grafico-barras">
                        <div class="barra-grupo">
                            <div class="barra-item">
                                <div class="barra-label">Presentes</div>
                                <div class="barra-container">
                                    <div class="barra" style="width: ${Math.max(5, (totalPresentes / Math.max(1, totalRegistros) * 100))}%; background: #10b981;"></div>
                                </div>
                                <div class="barra-valor">${totalPresentes} (${totalRegistros > 0 ? ((totalPresentes / totalRegistros * 100).toFixed(1)) : 0}%)</div>
                            </div>
                            <div class="barra-item">
                                <div class="barra-label">Ausentes</div>
                                <div class="barra-container">
                                    <div class="barra" style="width: ${Math.max(5, (totalAusentes / Math.max(1, totalRegistros) * 100))}%; background: #ef4444;"></div>
                                </div>
                                <div class="barra-valor">${totalAusentes} (${totalRegistros > 0 ? ((totalAusentes / totalRegistros * 100).toFixed(1)) : 0}%)</div>
                            </div>
                            <div class="barra-item">
                                <div class="barra-label">Justificados</div>
                                <div class="barra-container">
                                    <div class="barra" style="width: ${Math.max(5, (totalJustificados / Math.max(1, totalRegistros) * 100))}%; background: #f59e0b;"></div>
                                </div>
                                <div class="barra-valor">${totalJustificados} (${totalRegistros > 0 ? ((totalJustificados / totalRegistros * 100).toFixed(1)) : 0}%)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const contenido = document.getElementById('reporteContent');
        if (contenido) {
            contenido.innerHTML = html;
            console.log('✅ Reportes renderizados');
        } else {
            console.error('❌ reporteContent no encontrado');
        }
        
    } catch (error) {
        console.error('❌ Error en cargarReporteGrupo:', error);
        mostrarMensajeReportes(`❌ Error: ${error.message}`);
    }
}

// ===== APLICAR FILTROS =====
function aplicarFiltros() {
    const filtroEvento = document.getElementById('filtroEvento')?.value || '';
    const filtroEstado = document.getElementById('filtroEstado')?.value || '';
    
    const filas = document.querySelectorAll('.fila-tabla');
    
    filas.forEach(fila => {
        let mostrar = true;
        
        // Filtrar por estado
        if (filtroEstado) {
            const presentes = parseInt(fila.dataset.presentes) || 0;
            const ausentes = parseInt(fila.dataset.ausentes) || 0;
            const justificados = parseInt(fila.dataset.justificados) || 0;
            
            if (filtroEstado === 'presente' && presentes === 0) mostrar = false;
            if (filtroEstado === 'ausente' && ausentes === 0) mostrar = false;
            if (filtroEstado === 'justificado' && justificados === 0) mostrar = false;
        }
        
        fila.style.display = mostrar ? '' : 'none';
    });
    
    console.log(`📊 Filtros aplicados - Evento: ${filtroEvento}, Estado: ${filtroEstado}`);
}

// ===== MOSTRAR MENSAJE EN REPORTES =====
function mostrarMensajeReportes(mensaje) {
    const contenido = document.getElementById('reporteContent');
    if (contenido) {
        contenido.innerHTML = `<div style="background: var(--light); padding: 40px; border-radius: 12px; text-align: center; color: var(--text-light);">
            <p>${mensaje}</p>
            <p style="font-size: 12px;">Registra asistencia para ver reportes aquí</p>
        </div>`;
    }
}

console.log('✅ reportes-v17.js CARGADO');