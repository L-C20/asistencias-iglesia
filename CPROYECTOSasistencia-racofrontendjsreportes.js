
// ===== ACTUALIZAR HEADER TABLA CON DÍAS ABREVIADOS =====
window.actualizarHeaderTabla = function() {
    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const headEl = document.getElementById('tablaDetalleHead');
    
    if (headEl) {
        let html = '<tr><th style="min-width:130px">Nombre</th>';
        fechasCulto.forEach(fecha => {
            const fecha_obj = new Date(fecha + 'T00:00:00');
            const dia = fecha_obj.getDate();
            const diaSemana = fecha_obj.getDay();
            const diasAbr = { 0: 'Dom', 2: 'Mar', 6: 'Sab' };
            const diaAbr = diasAbr[diaSemana] || '-';
            html += `<th style="text-align:center;min-width:55px;font-size:11px;font-weight:700">${diaAbr}<br><small>${dia}</small></th>`;
        });
        html += '</tr>';
        headEl.innerHTML = html;
    }
};

// ===== GENERAR TABLA HORIZONTAL MEJORADA =====
window.generarTablaHorizontal = function(datos) {
    if (!datos || datos.length === 0) return '<tr><td colspan="10">Sin datos</td></tr>';
    
    window.actualizarHeaderTabla();
    
    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const miembros = [...new Set(datos.map(d => `${d.nombre}|${d.apellido || ''}|${d.id}`))];
    
    let html = '';
    
    miembros.forEach(miembro => {
        const [nombre, apellido, id] = miembro.split('|');
        const nombreCompleto = `${nombre}${apellido ? ' ' + apellido : ''}`.substring(0, 20);
        html += `<tr><td style="font-weight:700;min-width:130px;font-size:12px;overflow:hidden;text-overflow:ellipsis">${nombreCompleto}</td>`;
        
        fechasCulto.forEach(fecha => {
            const registro = datos.find(d => d.id == id && d.fecha.split('T')[0] === fecha);
            let estado = '-';
            if (registro) {
                if (registro.justified) {
                    estado = 'AJ';
                } else if (!registro.presente) {
                    estado = 'A';
                } else {
                    estado = 'P';
                }
            }
            
            const color = estado === 'P' ? '#10b981' : estado === 'AJ' ? '#f59e0b' : estado === 'A' ? '#ef4444' : '#9ca3af';
            html += `<td style="text-align:center;font-weight:700;color:${color};padding:8px 4px;font-size:12px">${estado}</td>`;
        });
        html += '</tr>';
    });
    
    return html;
};
