// ===== TABLA DE REPORTE: NOMBRE | INSTRUMENTO | una columna por día de culto =====
const DIAS_ABREVIADOS = { 0: 'Dom', 2: 'Mar', 6: 'Sáb' };

window.actualizarHeaderTabla = function() {
    const headEl = document.getElementById('tablaDetalleHead');
    if (!headEl) return;

    const fechasCulto = window.obtenerFechasCultoDeSemana();

    let html = '<tr><th>Nombre y Apellido</th><th>Instrumento</th>';

    fechasCulto.forEach(fecha => {
        const dia = new Date(fecha + 'T00:00:00');
        const abr = DIAS_ABREVIADOS[dia.getDay()] || '-';
        const ddmm = `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}`;
        html += `<th class="col-dia"><span class="col-dia-nombre">${abr}</span><span class="col-dia-fecha">${ddmm}</span></th>`;
    });

    headEl.innerHTML = html + '</tr>';
};

window.generarTablaHorizontal = function(datos) {
    if (!datos || datos.length === 0) {
        return '<tr><td colspan="10" class="tabla-vacia">Sin datos</td></tr>';
    }

    window.actualizarHeaderTabla();

    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const miembros = [...new Set(datos.map(d => `${d.nombre}|${d.apellido || ''}|${d.id}|${d.instrumento || '—'}`))];

    let html = '';

    miembros.forEach(miembro => {
        const [nombre, apellido, id, instrumento] = miembro.split('|');
        const nombreCompleto = `${nombre}${apellido ? ' ' + apellido : ''}`;

        html += '<tr>';
        html += `<td class="celda-nombre">${nombreCompleto}</td>`;
        html += `<td class="celda-detalle">${instrumento}</td>`;

        fechasCulto.forEach(fecha => {
            const registro = datos.find(d => d.id == id && d.fecha && d.fecha.split('T')[0] === fecha);

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
