const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const { GRUPOS_DISPONIBLES, configDeIglesia } = require('../config');
const router = express.Router();

// Descarga en Excel o PDF de lo que se ve en el detalle del reporte: una
// columna por fecha, secciones con subtotales, total general y notas.
// GET /api/exportar/:grupo?tipo_evento=santo_culto&fechas=2026-09-15,2026-09-19&formato=xlsx|pdf

const NOMBRES_EVENTO = { santo_culto: 'Santo Culto', ensayo: 'Ensayo', bautismo: 'Bautismo' };
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function etiquetaFecha(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fechaLarga(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function estadoDe(r) {
  if (!r) return '';
  if (r.justificado) return 'AJ';
  return r.presente ? 'P' : 'A';
}

// Arma la estructura común a los dos formatos
async function armarDatos(iglesiaId, grupo, tipoEvento, fechas) {
  const iglesia = await db.query('SELECT * FROM iglesias WHERE id = $1', [iglesiaId]);
  if (iglesia.rows.length === 0) throw new Error('Iglesia no encontrada');
  const cfg = configDeIglesia(iglesia.rows[0]);
  const infoGrupo = GRUPOS_DISPONIBLES[grupo];
  if (!infoGrupo || !cfg.grupos.some(g => g.id === grupo)) throw new Error('Grupo inválido');

  const miembros = (await db.query(
    `SELECT m.id, m.nombre, CASE WHEN m.grupo = 'coro' THEN m.voz ELSE m.instrumento END AS seccion
     FROM miembros m WHERE m.iglesia_id = $1 AND m.grupo = $2 AND m.activo = true ORDER BY m.nombre`,
    [iglesiaId, grupo]
  )).rows;

  const registros = (await db.query(
    `SELECT ra.miembro_id, TO_CHAR(ra.fecha, 'YYYY-MM-DD') AS fecha, ra.presente, ra.justificado
     FROM registro_asistencia ra
     JOIN miembros m ON m.id = ra.miembro_id
     WHERE m.iglesia_id = $1 AND m.grupo = $2 AND ra.tipo_evento = $3 AND ra.fecha = ANY($4::date[])`,
    [iglesiaId, grupo, tipoEvento, fechas]
  )).rows;

  const notas = (await db.query(
    `SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion FROM eventos
     WHERE iglesia_id = $1 AND grupo = $2 AND tipo_evento = $3 AND fecha = ANY($4::date[]) AND descripcion IS NOT NULL
     ORDER BY fecha`,
    [iglesiaId, grupo, tipoEvento, fechas]
  )).rows;

  // registro por integrante y fecha
  const porClave = {};
  registros.forEach(r => { porClave[`${r.miembro_id}|${r.fecha}`] = r; });

  // secciones en el orden del grupo
  const sinSeccion = `Sin ${infoGrupo.categoria.toLowerCase()}`;
  const porSeccion = {};
  miembros.forEach(m => {
    const k = m.seccion || sinSeccion;
    (porSeccion[k] = porSeccion[k] || []).push(m);
  });
  const orden = [
    ...infoGrupo.secciones.filter(s => porSeccion[s]),
    ...Object.keys(porSeccion).filter(k => !infoGrupo.secciones.includes(k)).sort()
  ];

  const contar = (lista, fecha) => {
    const c = { P: 0, A: 0, AJ: 0, sin: 0 };
    lista.forEach(m => {
      const e = estadoDe(porClave[`${m.id}|${fecha}`]);
      if (e) c[e]++; else c.sin++;
    });
    return c;
  };

  const secciones = orden.map(nombre => ({
    nombre,
    miembros: porSeccion[nombre],
    subtotales: fechas.map(f => contar(porSeccion[nombre], f))
  }));

  return {
    iglesia: cfg.nombre,
    grupo: infoGrupo,
    tipoEvento: NOMBRES_EVENTO[tipoEvento] || tipoEvento,
    fechas,
    miembros,
    secciones,
    totales: fechas.map(f => contar(miembros, f)),
    notas,
    estado: (m, f) => estadoDe(porClave[`${m.id}|${f}`])
  };
}

function textoSubtotal(c) {
  const partes = [];
  if (c.P) partes.push(`${c.P} P`);
  if (c.A) partes.push(`${c.A} A`);
  if (c.AJ) partes.push(`${c.AJ} AJ`);
  if (c.sin && partes.length) partes.push(`${c.sin} s/m`);
  return partes.length ? partes.join(' · ') : '—';
}

function nombreArchivo(datos, ext) {
  const limpio = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rango = datos.fechas.length > 1 ? `${datos.fechas[0]}-al-${datos.fechas[datos.fechas.length - 1]}` : datos.fechas[0];
  return `asistencia-${limpio(datos.iglesia)}-${limpio(datos.grupo.nombre)}-${limpio(datos.tipoEvento)}-${rango}.${ext}`;
}

// ===== EXCEL =====
async function generarExcel(datos, res) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Asistencia', { views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }] });

  const nCols = 2 + datos.fechas.length;
  const RELLENO = {
    P: 'FFDCFCE7', A: 'FFFEE2E2', AJ: 'FFFEF3C7',
    cabecera: 'FFF2F4F7', seccion: 'FFF9FAFB', total: 'FFEAECF0'
  };
  const relleno = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
  const borde = { top: { style: 'thin', color: { argb: 'FFE4E7EC' } }, bottom: { style: 'thin', color: { argb: 'FFE4E7EC' } }, left: { style: 'thin', color: { argb: 'FFE4E7EC' } }, right: { style: 'thin', color: { argb: 'FFE4E7EC' } } };

  // Título
  ws.mergeCells(1, 1, 1, nCols);
  ws.getCell(1, 1).value = `${datos.iglesia} · ${datos.grupo.nombre} · ${datos.tipoEvento}`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, nCols);
  ws.getCell(2, 1).value = datos.fechas.length > 1
    ? `Del ${fechaLarga(datos.fechas[0])} al ${fechaLarga(datos.fechas[datos.fechas.length - 1])}`
    : fechaLarga(datos.fechas[0]);
  ws.getCell(2, 1).font = { color: { argb: 'FF667085' } };
  ws.mergeCells(3, 1, 3, nCols);
  ws.getCell(3, 1).value = 'P = Presente · A = Ausente · AJ = Ausente justificado · — = sin marcar';
  ws.getCell(3, 1).font = { size: 9, color: { argb: 'FF98A2B3' } };

  // Cabecera (fila 5)
  const cab = ws.getRow(5);
  cab.values = ['Nombre y Apellido', datos.grupo.categoria, ...datos.fechas.map(etiquetaFecha)];
  cab.eachCell(c => { c.font = { bold: true, size: 10 }; c.fill = relleno(RELLENO.cabecera); c.border = borde; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
  cab.getCell(1).alignment = { horizontal: 'left' };
  cab.getCell(2).alignment = { horizontal: 'left' };

  let fila = 6;
  datos.secciones.forEach(s => {
    const r = ws.getRow(fila++);
    r.values = [`${s.nombre} (${s.miembros.length})`, '', ...s.subtotales.map(textoSubtotal)];
    r.eachCell({ includeEmpty: true }, c => { c.font = { bold: true, size: 10 }; c.fill = relleno(RELLENO.seccion); c.border = borde; c.alignment = { horizontal: 'center' }; });
    r.getCell(1).alignment = { horizontal: 'left' };

    s.miembros.forEach(m => {
      const rm = ws.getRow(fila++);
      rm.values = [m.nombre, m.seccion || '', ...datos.fechas.map(f => datos.estado(m, f) || '—')];
      rm.eachCell({ includeEmpty: true }, (c, i) => {
        c.border = borde;
        if (i > 2) {
          c.alignment = { horizontal: 'center' };
          const e = c.value;
          if (RELLENO[e]) { c.fill = relleno(RELLENO[e]); c.font = { bold: true, color: { argb: e === 'P' ? 'FF067647' : e === 'A' ? 'FFB42318' : 'FFB54708' } }; }
          else c.font = { color: { argb: 'FF98A2B3' } };
        }
      });
    });
  });

  const rt = ws.getRow(fila++);
  rt.values = [`Total (${datos.miembros.length})`, '', ...datos.totales.map(textoSubtotal)];
  rt.eachCell({ includeEmpty: true }, c => { c.font = { bold: true }; c.fill = relleno(RELLENO.total); c.border = borde; c.alignment = { horizontal: 'center' }; });
  rt.getCell(1).alignment = { horizontal: 'left' };

  if (datos.notas.length) {
    fila++;
    ws.getCell(fila++, 1).value = 'Notas';
    ws.getCell(fila - 1, 1).font = { bold: true };
    datos.notas.forEach(n => {
      ws.getCell(fila, 1).value = etiquetaFecha(n.fecha);
      ws.mergeCells(fila, 2, fila, nCols);
      ws.getCell(fila, 2).value = n.descripcion;
      fila++;
    });
  }

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 16;
  for (let i = 3; i <= nCols; i++) ws.getColumn(i).width = 16;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(datos, 'xlsx')}"`);
  await wb.xlsx.write(res);
  res.end();
}

// ===== PDF =====
function generarPdf(datos, res) {
  // bufferPages permite volver a cada página al final para numerarlas
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: `Asistencia ${datos.tipoEvento}` } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo(datos, 'pdf')}"`);
  doc.pipe(res);

  const COLOR = { texto: '#101828', gris: '#667085', claro: '#98A2B3', borde: '#E4E7EC', fondo: '#F9FAFB', P: '#067647', A: '#B42318', AJ: '#B54708', Pf: '#DCFCE7', Af: '#FEE2E2', AJf: '#FEF3C7' };
  const x0 = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const altoFila = 18;
  const anchoNombre = 190;
  const anchoSeccion = 90;
  const anchoFecha = (anchoUtil - anchoNombre - anchoSeccion) / Math.max(datos.fechas.length, 1);
  const colX = i => x0 + anchoNombre + anchoSeccion + i * anchoFecha;

  let y;

  const cabeceraPagina = () => {
    y = doc.page.margins.top;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR.texto)
      .text(`${datos.iglesia} · ${datos.grupo.nombre} · ${datos.tipoEvento}`, x0, y);
    y += 18;
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.gris).text(
      datos.fechas.length > 1
        ? `Del ${fechaLarga(datos.fechas[0])} al ${fechaLarga(datos.fechas[datos.fechas.length - 1])}`
        : fechaLarga(datos.fechas[0]),
      x0, y
    );
    doc.text('P = Presente · A = Ausente · AJ = Ausente justificado · — = sin marcar', x0, y, { width: anchoUtil, align: 'right' });
    y += 18;
    // cabecera de la tabla
    doc.rect(x0, y, anchoUtil, altoFila).fill('#F2F4F7');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR.gris);
    doc.text('NOMBRE Y APELLIDO', x0 + 6, y + 5, { width: anchoNombre - 12 });
    doc.text(datos.grupo.categoria.toUpperCase(), x0 + anchoNombre + 6, y + 5, { width: anchoSeccion - 12 });
    datos.fechas.forEach((f, i) => doc.text(etiquetaFecha(f).toUpperCase(), colX(i), y + 5, { width: anchoFecha, align: 'center' }));
    y += altoFila;
  };

  const asegurarEspacio = alto => {
    if (y + alto > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      cabeceraPagina();
    }
  };

  const lineaInferior = () => doc.moveTo(x0, y + altoFila).lineTo(x0 + anchoUtil, y + altoFila).lineWidth(0.5).strokeColor(COLOR.borde).stroke();

  cabeceraPagina();

  datos.secciones.forEach(s => {
    asegurarEspacio(altoFila * 2);
    doc.rect(x0, y, anchoUtil, altoFila).fill(COLOR.fondo);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text(`${s.nombre}  (${s.miembros.length})`, x0 + 6, y + 5, { width: anchoNombre + anchoSeccion - 12 });
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.gris);
    s.subtotales.forEach((c, i) => doc.text(textoSubtotal(c), colX(i), y + 5, { width: anchoFecha, align: 'center' }));
    lineaInferior();
    y += altoFila;

    s.miembros.forEach(m => {
      asegurarEspacio(altoFila);
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.texto).text(m.nombre, x0 + 6, y + 5, { width: anchoNombre - 12, lineBreak: false, ellipsis: true });
      doc.fillColor(COLOR.gris).fontSize(8).text(m.seccion || '', x0 + anchoNombre + 6, y + 5, { width: anchoSeccion - 12, lineBreak: false, ellipsis: true });
      datos.fechas.forEach((f, i) => {
        const e = datos.estado(m, f);
        const cx = colX(i) + anchoFecha / 2;
        if (e) {
          doc.roundedRect(cx - 12, y + 3, 24, 12, 6).fill(COLOR[e + 'f']);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR[e]).text(e, cx - 12, y + 5, { width: 24, align: 'center' });
        } else {
          doc.font('Helvetica').fontSize(9).fillColor(COLOR.claro).text('—', colX(i), y + 5, { width: anchoFecha, align: 'center' });
        }
      });
      lineaInferior();
      y += altoFila;
    });
  });

  asegurarEspacio(altoFila);
  doc.rect(x0, y, anchoUtil, altoFila).fill('#EAECF0');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text(`Total  (${datos.miembros.length})`, x0 + 6, y + 5);
  datos.totales.forEach((c, i) => doc.text(textoSubtotal(c), colX(i), y + 5, { width: anchoFecha, align: 'center' }));
  y += altoFila;

  if (datos.notas.length) {
    asegurarEspacio(altoFila * (datos.notas.length + 2));
    y += 12;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto).text('Notas', x0, y);
    y += 14;
    doc.font('Helvetica').fontSize(9);
    datos.notas.forEach(n => {
      doc.fillColor(COLOR.gris).text(`${etiquetaFecha(n.fecha)}: `, x0, y, { continued: true }).fillColor(COLOR.texto).text(n.descripcion);
      y += 14;
    });
  }

  // Pie con fecha de generación en cada página
  const paginas = doc.bufferedPageRange();
  const yPie = doc.page.height - doc.page.margins.bottom + 6;
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    // El pie va dentro del margen inferior: sin esto pdfkit abriría otra hoja
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.claro).text(
      `Generado el ${new Date().toLocaleDateString('es-AR')} · página ${i + 1} de ${paginas.count}`,
      x0, yPie, { width: anchoUtil, align: 'right', lineBreak: false }
    );
  }

  doc.end();
}

router.get('/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;
    const tipoEvento = String(req.query.tipo_evento || '');
    const formato = req.query.formato === 'pdf' ? 'pdf' : 'xlsx';
    const fechas = String(req.query.fechas || '').split(',').map(f => f.trim()).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));

    if (!NOMBRES_EVENTO[tipoEvento]) return res.status(400).json({ error: 'tipo_evento inválido' });
    if (fechas.length === 0) return res.status(400).json({ error: 'Indicá al menos una fecha' });

    const datos = await armarDatos(req.user.iglesia_id, grupo, tipoEvento, fechas);
    if (formato === 'pdf') return generarPdf(datos, res);
    await generarExcel(datos, res);
  } catch (error) {
    console.error('❌ Error exportando:', error.message);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
});

module.exports = router;
