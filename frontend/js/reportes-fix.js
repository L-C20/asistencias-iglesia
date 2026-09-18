// ===== TABLA DE REPORTE: NOMBRE | INSTRUMENTO | una columna por día de culto =====
// Ensayos y bautismos pueden caer cualquier día, no solo en los de culto
const DIAS_ABREVIADOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

window.actualizarHeaderTabla = function() {
    const headEl = document.getElementById('tablaDetalleHead');
    if (!headEl) return;

    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const fechasConDatos = new Set((window.datosReporte || []).filter(d => d.fecha).map(d => d.fecha.split('T')[0]));

    let html = '<tr><th>Nombre y Apellido</th><th>Instrumento</th>';

    fechasCulto.forEach(fecha => {
        const dia = new Date(fecha + 'T00:00:00');
        const abr = DIAS_ABREVIADOS[dia.getDay()];
        const ddmm = `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}`;
        const borrar = fechasConDatos.has(fecha)
            ? `<button type="button" class="col-dia-borrar" title="Eliminar este evento" onclick="eliminarEvento('${fecha}')">&times;</button>`
            : '';
        html += `<th class="col-dia"><span class="col-dia-nombre">${abr}</span><span class="col-dia-fecha">${ddmm}</span>${borrar}</th>`;
    });

    headEl.innerHTML = html + '</tr>';
};

// filas: integrantes a listar; registros: asistencias de la semana para llenar las celdas
window.generarTablaHorizontal = function(filas, registros) {
    if (!filas || filas.length === 0) {
        return '<tr><td colspan="10" class="tabla-vacia">Sin datos</td></tr>';
    }

    window.actualizarHeaderTabla();

    const fechasCulto = window.obtenerFechasCultoDeSemana();

    let html = '';

    filas.forEach(miembro => {
        const nombreCompleto = `${miembro.nombre}${miembro.apellido ? ' ' + miembro.apellido : ''}`;

        html += '<tr>';
        html += `<td class="celda-nombre">${nombreCompleto}</td>`;
        html += `<td class="celda-detalle">${miembro.instrumento || '—'}</td>`;

        fechasCulto.forEach(fecha => {
            const registro = registros.find(d => d.id == miembro.id && d.fecha.split('T')[0] === fecha);

            let texto = '—';
            let clase = 'marca-vacia';

            if (registro) {
                if (registro.justified) {
                    texto = 'AJ';
                    clase = 'marca-aj';
                } else if (registro.presente) {
                    texto = 'P';
                    clase = 'marca-p';
                } else {
                    texto = 'A';
                    clase = 'marca-a';
                }
            }

            html += `<td class="celda-marca"><span class="marca ${clase}">${texto}</span></td>`;
        });

        html += '</tr>';
    });

    return html;
};
