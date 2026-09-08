// CONSTANTES
const INSTRUMENTOS = [
  'Violín',
  'Viola',
  'Violoncello',
  'Contrabajo',
  'Flauta traversa',
  'Oboe',
  'Clarinete',
  'Saxofón',
  'Trompeta',
  'Corno',
  'Trombón',
  'Eufonio',
  'Tuba',
  'Órgano',
  'Acordeón',
  'Bajo'
];

const VOCES = [
  'Soprano',
  'Contralto',
  'Tenor',
  'Bajo'
];

let miembrosActuales = [];

// ===== CARGAR MIEMBROS =====
async function cargarMiembros(grupo) {
  try {
    const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const miembros = await response.json();
    miembrosActuales = miembros;
    
    const container = document.getElementById(`${grupo}List`);
    container.innerHTML = '';
    
    miembros.forEach(miembro => {
      const detalleExtra = grupo === 'coro' 
        ? `<small>${miembro.voz || '—'}</small>`
        : `<small>${miembro.instrumento || '—'}</small>`;
      
      const div = document.createElement('div');
      div.className = 'miembro-item';
      div.innerHTML = `
        <div class="miembro-info">
          <span class="miembro-nombre">${miembro.nombre}</span>
          ${detalleExtra}
        </div>
        <div class="miembro-buttons">
          <button class="btn btn-check presente" onclick="registrarAsistencia(${miembro.id}, '${grupo}', true)">✓ Presente</button>
          <button class="btn btn-check ausente" onclick="registrarAsistencia(${miembro.id}, '${grupo}', false)">✗ Ausente</button>
          <button class="btn btn-check justificado" onclick="registrarAsistencia(${miembro.id}, '${grupo}', null, 'Justificado')">? Justificado</button>
        </div>
      `;
      container.appendChild(div);
    });
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar miembros');
  }
}

// ===== REGISTRAR ASISTENCIA =====
async function registrarAsistencia(miembroId, grupo, presente, nota = '') {
  const fecha = grupo === 'coro' ? document.getElementById('fechaCoro').value : document.getElementById('fechaOrquesta').value;
  const tipoEvento = grupo === 'coro' ? document.getElementById('tipoEventoCoro').value : document.getElementById('tipoEventoOrquesta').value;
  
  try {
    const response = await fetch(`${API_URL}/asistencia/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        miembro_id: miembroId,
        tipo_evento: tipoEvento,
        fecha: fecha,
        presente: presente,
        nota: nota
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarMensajeExito('Asistencia registrada');
      cargarMiembros(grupo);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al registrar asistencia');
  }
}

// ===== MODAL MEJORADO =====
function abrirModalAgregarMiembro(grupo) {
  const modal = document.getElementById('modalAgregarMiembro');
  document.getElementById('grupoNuevo').value = grupo;
  document.getElementById('nombreNuevo').value = '';
  
  // Limpiar y llenar selects
  const selectInstrumento = document.getElementById('instrumentoNuevo');
  const selectVoz = document.getElementById('vozNueva');
  
  selectInstrumento.innerHTML = '<option value="">-- Seleccionar instrumento --</option>';
  selectVoz.innerHTML = '<option value="">-- Seleccionar voz --</option>';
  
  if (grupo === 'orquesta') {
    selectInstrumento.style.display = 'block';
    selectVoz.style.display = 'none';
    document.getElementById('labelInstrumento').style.display = 'block';
    document.getElementById('labelVoz').style.display = 'none';
    
    INSTRUMENTOS.forEach(inst => {
      const option = document.createElement('option');
      option.value = inst;
      option.textContent = inst;
      selectInstrumento.appendChild(option);
    });
  } else {
    selectInstrumento.style.display = 'none';
    selectVoz.style.display = 'block';
    document.getElementById('labelInstrumento').style.display = 'none';
    document.getElementById('labelVoz').style.display = 'block';
    
    VOCES.forEach(voz => {
      const option = document.createElement('option');
      option.value = voz;
      option.textContent = voz;
      selectVoz.appendChild(option);
    });
  }
  
  modal.classList.add('show');
}

function agregarMiembroCoro() {
  abrirModalAgregarMiembro('coro');
}

function agregarMiembroOrquesta() {
  abrirModalAgregarMiembro('orquesta');
}

// ===== GUARDAR NUEVO MIEMBRO =====
async function guardarNuevoMiembro(e) {
  e.preventDefault();
  
  const nombre = document.getElementById('nombreNuevo').value;
  const grupo = document.getElementById('grupoNuevo').value;
  const instrumento = document.getElementById('instrumentoNuevo').value;
  const voz = document.getElementById('vozNueva').value;
  
  if (!nombre) {
    alert('El nombre es requerido');
    return;
  }
  
  if (grupo === 'orquesta' && !instrumento) {
    alert('Debe seleccionar un instrumento');
    return;
  }
  
  if (grupo === 'coro' && !voz) {
    alert('Debe seleccionar una voz');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/asistencia/miembro/nuevo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nombre: nombre,
        grupo: grupo,
        instrumento: grupo === 'orquesta' ? instrumento : null,
        voz: grupo === 'coro' ? voz : null
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      cerrarModal();
      mostrarMensajeExito('Miembro agregado correctamente');
      cargarMiembros(grupo);
      
      // Mostrar tabla
      mostrarTablaMiembros(grupo);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al agregar miembro');
  }
}

// ===== TABLA CON FILTROS =====
function mostrarTablaMiembros(grupo) {
  const modal = document.getElementById('modalTablaMiembros');
  if (!modal) return;
  
  modal.classList.add('show');
  actualizarTablaMiembros(grupo);
}

function actualizarTablaMiembros(grupo) {
  const filtro = document.getElementById('filtroMiembros').value;
  const tbody = document.getElementById('tablaMiembrosBody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  let miembrosFiltrados = miembrosActuales;
  
  if (filtro) {
    if (grupo === 'orquesta') {
      miembrosFiltrados = miembrosActuales.filter(m => 
        m.instrumento && m.instrumento.toLowerCase().includes(filtro.toLowerCase())
      );
    } else {
      miembrosFiltrados = miembrosActuales.filter(m => 
        m.voz && m.voz.toLowerCase().includes(filtro.toLowerCase())
      );
    }
  }
  
  if (miembrosFiltrados.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" style="text-align: center; padding: 20px;">No hay miembros</td>';
    tbody.appendChild(tr);
    return;
  }
  
  miembrosFiltrados.forEach(miembro => {
    const tr = document.createElement('tr');
    const detalleExtra = grupo === 'coro' ? miembro.voz : miembro.instrumento;
    
    tr.innerHTML = `
      <td>${miembro.nombre}</td>
      <td>${detalleExtra || '—'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="eliminarMiembro(${miembro.id}, '${grupo}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function eliminarMiembro(id, grupo) {
  if (confirm('¿Está seguro de que desea eliminar este miembro?')) {
    // Aquí iría la llamada para eliminar en BD
    console.log('Eliminar miembro:', id);
    mostrarMensajeExito('Miembro eliminado');
  }
}

// ===== EVENTOS =====
document.addEventListener('DOMContentLoaded', () => {
  const filtro = document.getElementById('filtroMiembros');
  if (filtro) {
    filtro.addEventListener('input', () => {
      const grupo = document.querySelector('.tab-content.active').id;
      actualizarTablaMiembros(grupo);
    });
  }
  
  const formNuevo = document.getElementById('formNuevoMiembro');
  if (formNuevo) {
    formNuevo.addEventListener('submit', guardarNuevoMiembro);
  }
});