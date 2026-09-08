let chartInstance = null;

// ===== CARGAR REPORTE =====
async function cargarReporte(grupo) {
    try {
        const response = await fetch(`${API_URL}/reportes/estadisticas/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const estadisticas = await response.json();
        const contenido = document.getElementById('reporteContent');
        
        // Gráfico de asistencia por mes
        const meses = estadisticas.map(e => e.mes.split('T')[0]);
        const porcentajes = estadisticas.map(e => parseFloat(e.porcentaje));
        const presentes = estadisticas.map(e => e.presentes);
        const ausentes = estadisticas.map(e => e.ausentes);
        
        dibujarGrafico(meses, porcentajes, presentes, ausentes);
        
        // Tabla de datos
        contenido.innerHTML += `
            <h3>Detalle por Mes</h3>
            <table class="tabla-asistencia">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Total Eventos</th>
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
                            <td><strong>${e.porcentaje}%</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="export-buttons">
                <button class="btn btn-success" onclick="exportarExcel('${grupo}')">📥 Descargar Excel</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar reportes');
    }
}

// ===== DIBUJAR GRÁFICO =====
function dibujarGrafico(meses, porcentajes, presentes, ausentes) {
    const contenido = document.getElementById('reporteContent');
    contenido.innerHTML = `<div class="chart-container"><canvas id="graficoAsistencia"></canvas></div>`;
    
    const ctx = document.getElementById('graficoAsistencia').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: '% Asistencia',
                    data: porcentajes,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Presentes',
                    data: presentes,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Ausentes',
                    data: ausentes,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Asistencia por Mes'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
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

// ===== EXPORTAR EXCEL =====
async function exportarExcel(grupo) {
    const hoy = new Date();
    const hace3Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1);
    
    const fechaInicio = hace3Meses.toISOString().split('T')[0];
    const fechaFin = hoy.toISOString().split('T')[0];
    
    try {
        const response = await fetch(`${API_URL}/reportes/exportar/${grupo}/${fechaInicio}/${fechaFin}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencia-${grupo}-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al descargar Excel');
    }
}