// ===== TABLA DE REPORTE =====
// Secciones colapsables por instrumento, una columna por día, subtotales por
// sección y totales generales al pie.

// Ensayos y bautismos pueden caer cualquier día, no solo en los de culto
const DIAS_ABREVIADOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Qué secciones dejó abiertas el usuario; sobrevive a cambios de semana y filtros
const seccionesAbiertas = new Set();

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
            ? `<button type="button" class="col-dia-borrar" title="Eliminar este evento" onclick="eliminarEvento('${fecha}')">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                       <polyline points="3 6 5 6 21 6"></polyline>
                       <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                   </svg>
               </button>`
            : '';
        html += `<th class="col-dia"><span class="col-dia-nombre">${abr}</span><span class="col-dia-fecha">${ddmm}</span>${borrar}</th>`;
    });

    headEl.innerHTML = html + '</tr>';
};

// Estado de un registro como P / A / AJ
function estadoDe(registro) {
    if (!registro) return null;
    if (registro.justified) return 'AJ';
    return registro.presente ? 'P' : 'A';
}

// Cuenta P/A/AJ de un conjunto de registros para una fecha
function contar(registros, fecha) {
    const c = { P: 0, A: 0, AJ: 0 };
    registros.forEach(r => {
        if (r.fecha.split('T')[0] !== fecha) return;
        c[estadoDe(r)]++;
    });
    return c;
}

function chipsSubtotal(c, total) {
    const marcados = c.P + c.A + c.AJ;
    if (marcados === 0) return '<span class="marca marca-vacia">—</span>';
    let html = '';
    if (c.P)  html += `<span class="sub sub-p"  title="Presentes">${c.P}</span>`;
    if (c.A)  html += `<span class="sub sub-a"  title="Ausentes">${c.A}</span>`;
    if (c.AJ) html += `<span class="sub sub-aj" title="Justificados">${c.AJ}</span>`;
    const sinMarcar = total - marcados;
    if (sinMarcar > 0) html += `<span class="sub sub-sin" title="Sin marcar">${sinMarcar}</span>`;
    return html;
}

// filas: integrantes a listar (ya filtrados); registros: asistencias de la semana;
// integrantes: todos, para los totales del evento completo; busqueda: si hay texto
window.generarTablaHorizontal = function({ filas, registros, integrantes, busqueda }) {
    window.actualizarHeaderTabla();

    const fechasCulto = window.obtenerFechasCultoDeSemana();
    const nColumnas = 2 + fechasCulto.length;

    // Agrupar filas visibles y el universo de integrantes por instrumento
    const agrupar = lista => {
        const g = {};
        lista.forEach(m => {
            const k = m.instrumento || 'Sin instrumento';
            (g[k] = g[k] || []).push(m);
        });
        return g;
    };
    const visiblesPorInst = agrupar(filas);
    const todosPorInst = agrupar(integrantes);

    const orden = [
        ...INSTRUMENTOS.filter(i => visiblesPorInst[i]),
        ...Object.keys(visiblesPorInst).filter(k => !INSTRUMENTOS.includes(k))
    ];

    let html = '';

    orden.forEach(instrumento => {
        const visibles = visiblesPorInst[instrumento];
        const todos = todosPorInst[instrumento] || [];
        const idsDeSeccion = new Set(todos.map(m => m.id));
        const registrosSeccion = registros.filter(r => idsDeSeccion.has(r.id));

        // Con búsqueda activa se abren las secciones que coinciden
        const abierta = busqueda || seccionesAbiertas.has(instrumento);

        html += `<tbody class="seccion-rep ${abierta ? 'abierta' : ''}" data-instrumento="${instrumento}">`;
        html += `<tr class="seccion-rep-cabecera" onclick="toggleSeccionReporte(this.parentElement)">`;
        html += `<td colspan="2"><div class="seccion-rep-titulo">
                    <svg class="seccion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    <span class="seccion-nombre">${instrumento}</span>
                    <span class="seccion-rep-n">${todos.length}</span>
                 </div></td>`;
        fechasCulto.forEach(fecha => {
            html += `<td class="celda-sub">${chipsSubtotal(contar(registrosSeccion, fecha), todos.length)}</td>`;
        });
        html += '</tr>';

        visibles.forEach(miembro => {
            const nombreCompleto = `${miembro.nombre}${miembro.apellido ? ' ' + miembro.apellido : ''}`;
            html += '<tr class="miembro-fila">';
            html += `<td class="celda-nombre">${nombreCompleto}</td>`;
            html += `<td class="celda-detalle">${miembro.instrumento || '—'}</td>`;
            fechasCulto.forEach(fecha => {
                const registro = registros.find(d => d.id == miembro.id && d.fecha.split('T')[0] === fecha);
                const estado = estadoDe(registro);
                const clase = estado ? `marca-${estado.toLowerCase()}` : 'marca-vacia';
                html += `<td class="celda-marca"><span class="marca ${clase}">${estado || '—'}</span></td>`;
            });
            html += '</tr>';
        });

        html += '</tbody>';
    });

    // Totales del evento completo, independientes de búsqueda y filtros
    html += '<tfoot><tr class="fila-total">';
    html += `<td colspan="2"><div class="seccion-rep-titulo"><span class="seccion-nombre">Total</span><span class="seccion-rep-n">${integrantes.length}</span></div></td>`;
    fechasCulto.forEach(fecha => {
        html += `<td class="celda-sub">${chipsSubtotal(contar(registros, fecha), integrantes.length)}</td>`;
    });
    html += '</tr></tfoot>';

    return html;
};

window.toggleSeccionReporte = function(tbody) {
    const inst = tbody.dataset.instrumento;
    const abrir = !tbody.classList.contains('abierta');
    tbody.classList.toggle('abierta', abrir);
    if (abrir) seccionesAbiertas.add(inst); else seccionesAbiertas.delete(inst);
};

window.expandirSeccionesReporte = function(abrir) {
    document.querySelectorAll('.seccion-rep').forEach(tb => {
        tb.classList.toggle('abierta', abrir);
        if (abrir) seccionesAbiertas.add(tb.dataset.instrumento); else seccionesAbiertas.delete(tb.dataset.instrumento);
    });
};
