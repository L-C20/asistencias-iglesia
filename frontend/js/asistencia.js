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
let miembroEnEdicion = null;
let grupoEnEdicion = null;

// ===== CARGAR MIEMBROS =====
async function cargarMiembros(grupo) {
  try {
    const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const miembros = await response.json();
    miembrosActuales = miembros;
    
    const tableBodyId = grupo === 'coro' ? 'coroTableBody' : 'orquestaTableBody';
    const tbody = document.getElementById(tableBodyId);
    
    tbody.innerHTML = '';
    
    if (miembros.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" style="text-align: center; padding: 30px; color: var(--text-light);">No hay miembros registrados</td>';
      tbody.appendChild(tr);
      return;
    }
    
    miembros.forEach(miembro => {
      const tr = document.createElement('tr');
      const detalleExtra = grupo === 'coro' ? (miembro.voz || '—') : (miembro.instrumento || '—');
      
      tr.innerHTML = `
        <td>${miembro.nombre}</td>
        <td>${detalleExtra}</td>
        <td style="text-align: center;">
          <button class="btn-cargar-asistencia" onclick="abrirModalAsistencia(${miembro.id}, '${grupo}', '${miembro.nombre}', '${detalleExtra}')">
            Cargar
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    mostrarToast('Miembros cargados', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al cargar miembros');
  }
}

// ===== ABRIR MODAL DE ASISTENCIA =====
function abrirModalAsistencia(miembroId, grupo, nombre, detalle) {
  miembroEnEdicion = miembroId;
  grupoEnEdicion = grupo;
  
  document.getElementById('nombreMiembroAsistencia').textContent = nombre;
  document.getElementById('detalleAsistencia').textContent = detalle;
  
  // Limpiar selección
  document.querySelectorAll('input[name="asistencia"]').forEach(radio => {
    radio.checked = false;
  });
  
  document.getElementById('modalAsistencia').classList.add('show');
}

// ===== GUARDAR ASISTENCIA =====
async function guardarAsistencia() {
  const opcionSeleccionada = document.querySelector('input[name="asistencia"]:checked');
  
  if (!opcionSeleccionada) {
    mostrarError('Debe seleccionar una opción');
    return;
  }
  
  const presente = opcionSeleccionada.value === 'presente' ? true : 
                   opcionSeleccionada.value === 'ausente' ? false : null;
  const nota = opcionSeleccionada.value === 'justificado' ? 'Justificado' : '';
  
  const fecha = grupoEnEdicion === 'coro' 
    ? document.getElementById('fechaCoro').value 
    : document.getElementById('fechaOrquesta').value;
  const tipoEvento = grupoEnEdicion === 'coro' 
    ? document.getElementById('tipoEventoCoro').value 
    : document.getElementById('tipoEventoOrquesta').value;
  
  try {
    const response = await fetch(`${API_URL}/asistencia/registrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        miembro_id: miembroEnEdicion,
        tipo_evento: tipoEvento,
        fecha: fecha,
        presente: presente,
        nota: nota
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarToast('Asistencia registrada', 'success');
      cerrarModalAsistencia();
    } else {
      mostrarError(data.error || 'Error al registrar asistencia');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al registrar asistencia');
  }
}

// ===== AGREGAR MIEMBRO =====
function abrirModalAgregarMiembro(grupo) {
  const modal = document.getElementById('modalAgregarMiembro');
  document.getElementById('grupoNuevo').value = grupo;
  document.getElementById('nombreNuevo').value = '';
  
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
    mostrarError('El nombre es requerido');
    return;
  }
  
  if (grupo === 'orquesta' && !instrumento) {
    mostrarError('Debe seleccionar un instrumento');
    return;
  }
  
  if (grupo === 'coro' && !voz) {
    mostrarError('Debe seleccionar una voz');
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
      mostrarToast('Miembro agregado correctamente', 'success');
      cargarMiembros(grupo);
    } else {
      mostrarError(data.error || 'Error al agregar miembro');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarError('Error al agregar miembro');
  }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
  const formNuevo = document.getElementById('formNuevoMiembro');
  if (formNuevo) {
    formNuevo.addEventListener('submit', guardarNuevoMiembro);
  }
});