// ===== MOVIMIENTOS DEL SISTEMA (solo super administrador) =====
// Quién hizo qué y cuándo: sesiones, asistencia, integrantes, usuarios, iglesias...

let movimientosPagina = 1;
let movimientosCategoriasArmadas = false;

async function cargarMovimientos(pagina = 1) {
    if (!esSuperadmin) return;
    const tbody = document.getElementById('movimientosTableBody');
    if (!tbody) return;

    movimientosPagina = pagina;
    armarFiltrosMovimientos();

    const params = new URLSearchParams({ pagina });
    const iglesia = document.getElementById('movimientosIglesia').value;
    const categoria = document.getElementById('movimientosCategoria').value;
    const usuario = document.getElementById('movimientosUsuario').value.trim();
    if (iglesia) params.set('iglesia_id', iglesia);
    if (categoria) params.set('categoria', categoria);
    if (usuario) params.set('usuario', usuario);

    try {
        const r = await fetch(`${API_URL}/movimientos?${params}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!r.ok) throw new Error('No se pudieron cargar');
        const datos = await r.json();

        if (!movimientosCategoriasArmadas) {
            const select = document.getElementById('movimientosCategoria');
            Object.entries(datos.categorias).forEach(([clave, nombre]) => {
                select.insertAdjacentHTML('beforeend', `<option value="${clave}">${escaparHtml(nombre)}</option>`);
            });
            movimientosCategoriasArmadas = true;
        }

        renderizarMovimientos(datos);
    } catch (e) {
        console.error('❌ Error cargando movimientos:', e);
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No se pudieron cargar los movimientos</td></tr>';
    }
}

// El filtro de iglesias se arma con las que ya conoce la pantalla
function armarFiltrosMovimientos() {
    const select = document.getElementById('movimientosIglesia');
    if (!select || select.options.length - 1 === iglesiasCargadas.length) return;
    const elegida = select.value;
    select.innerHTML = '<option value="">Todas las iglesias</option>' +
        iglesiasCargadas.map(i => `<option value="${i.id}">${escaparHtml(i.nombre)}</option>`).join('');
    select.value = elegida;
}

function renderizarMovimientos({ total, pagina, porPagina, movimientos }) {
    const tbody = document.getElementById('movimientosTableBody');
    const paginacion = document.getElementById('movimientosPaginacion');

    if (movimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No hay movimientos para los filtros elegidos</td></tr>';
    } else {
        tbody.innerHTML = movimientos.map(m => `
        <tr>
            <td class="celda-detalle movimiento-fecha">${escaparHtml(m.cuando)}</td>
            <td class="celda-nombre">${escaparHtml(m.usuario) || '—'}</td>
            <td class="celda-detalle">${escaparHtml(m.iglesia_nombre) || '—'}</td>
            <td class="celda-detalle">${escaparHtml(m.accion)}</td>
            <td class="celda-detalle">${escaparHtml(m.detalle) || '—'}</td>
        </tr>`).join('');
    }

    const paginas = Math.max(1, Math.ceil(total / porPagina));
    document.getElementById('movimientosResumen').textContent =
        total === 0 ? '' : `${total} movimiento${total === 1 ? '' : 's'} · página ${pagina} de ${paginas}`;
    document.getElementById('movimientosAnterior').disabled = pagina <= 1;
    document.getElementById('movimientosSiguiente').disabled = pagina >= paginas;
    paginacion.hidden = total <= porPagina;
}

console.log('✅ movimientos.js CARGADO');
