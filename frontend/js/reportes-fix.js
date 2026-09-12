// ===== TABLA MEJORADA - NOMBRE | INSTRUMENTO | DOM | MAR | SAB =====
window.actualizarHeaderTabla = function() {
    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const headEl = document.getElementById('tablaDetalleHead');

    if (headEl) {
        let html = '<tr>';
        html += '<th style="text-align:left;font-weight:800">Nombre y Apellido</th>';
        html += '<th style="text-align:left;font-weight:800">Instrumento</th>';

        fechasCulto.forEach(fecha => {
            const fecha_obj = new Date(fecha + 'T00:00:00');
            const diaSemana = fecha_obj.getDay();
            const diasAbr = { 0: 'Dom', 2: 'Mar', 6: 'Sáb' };
            const diaAbr = diasAbr[diaSemana] || '-';
            html += `<th style="text-align:center;font-weight:800;min-width:50px">${diaAbr}</th>`;
        });

        html += '</tr>';
        headEl.innerHTML = html;
    }
};

window.generarTablaHorizontal = function(datos) {
    if (!datos || datos.length === 0) return '<tr><td colspan="10" style="text-align:center;padding:20px">Sin datos</td></tr>';

    window.actualizarHeaderTabla();

    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const miembros = [...new Set(datos.map(d => `${d.nombre}|${d.apellido || ''}|${d.id}|${d.instrumento || d.voz || '-'}`))];

    let html = '';

    miembros.forEach(miembro => {
        const [nombre, apellido, id, instrumento] = miembro.split('|');
        const nombreCompleto = `${nombre}${apellido ? ' ' + apellido : ''}`;

        html += `<tr>`;
        html += `<td style="font-weight:700;font-size:13px;padding:10px 8px">${nombreCompleto}</td>`;
        html += `<td style="font-size:12px;color:#6b7280;padding:10px 8px">${instrumento}</td>`;

        fechasCulto.forEach(fecha => {
            const registro = datos.find(d => d.id == id && d.fecha.split('T')[0] === fecha);
            const presente = registro && registro.presente;
            const check = presente ? '✓' : '';
            const color = presente ? '#10b981' : '#d1d5db';
            const fontSize = presente ? '18px' : '14px';

            html += `<td style="text-align:center;font-weight:800;color:${color};padding:10px 4px;font-size:${fontSize}">${check}</td>`;
        });

        html += '</tr>';
    });

    return html;
};
