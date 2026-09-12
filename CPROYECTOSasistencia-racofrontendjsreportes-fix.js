
// ===== ACTUALIZAR HEADER TABLA CON COLSPAN =====
window.actualizarHeaderTabla = function() {
    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const headEl = document.getElementById('tablaDetalleHead');
    
    if (headEl) {
        let html = '<tr>';
        html += '<th style="min-width:130px;text-align:left">Nombre</th>';
        
        fechasCulto.forEach(fecha => {
            const fecha_obj = new Date(fecha + 'T00:00:00');
            const dia = fecha_obj.getDate();
            const diaSemana = fecha_obj.getDay();
            const diasAbr = { 0: 'Dom', 2: 'Mar', 6: 'Sab' };
            const diaAbr = diasAbr[diaSemana] || '-';
            html += `<th style="text-align:center;min-width:50px;font-size:11px;font-weight:700;padding:8px 4px">${diaAbr}<br><small style="font-size:10px">${dia}</small></th>`;
        });
        
        html += '</tr>';
        headEl.innerHTML = html;
        headEl.style.display = 'table-header-group';
    }
};

// ===== OVERRIDE generarTablaHorizontal =====
if (window.generarTablaHorizontal) {
    window.generarTablaHorizontal_OLD = window.generarTablaHorizontal;
    window.generarTablaHorizontal = function(datos) {
        if (!datos || datos.length === 0) return '<tr><td colspan="10" style="text-align:center;padding:20px">Sin datos</td></tr>';
        
        window.actualizarHeaderTabla();
        
        const fechasCulto = window.obtenerFechasCultoDeSemana();
        const miembros = [...new Set(datos.map(d => `${d.nombre}|${d.apellido || ''}|${d.id}`))];
        
        let html = '';
        
        miembros.forEach(miembro => {
            const [nombre, apellido, id] = miembro.split('|');
            const nombreCompleto = `${nombre}${apellido ? ' ' + apellido : ''}`.substring(0, 18);
            html += `<tr><td style="font-weight:700;min-width:130px;font-size:12px;padding:8px;overflow:hidden;text-overflow:ellipsis">${nombreCompleto}</td>`;
            
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
                const bgColor = estado === '-' ? '#f3f4f6' : 'white';
                html += `<td style="text-align:center;font-weight:700;color:${color};padding:6px 2px;font-size:13px;background:${bgColor};border-bottom:1px solid #e5e7eb">${estado}</td>`;
            });
            html += '</tr>';
        });
        
        return html;
    };
}
