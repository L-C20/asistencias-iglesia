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
    
    const tableBodyId = grupo === 'coro' ? 'coroTableBody' : 'orquestaTableBody';
    const tbody = document.getElementById(tableBodyId);
    
    tbody.innerHTML = '';
    
    if (miembros.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" style="text-align: center; padding: 30px; color: var(--text-light);">No hay miembros registrados</td>';
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
          <label class="checkbox-tabla presente" title="Presente">
            <input type="checkbox" onchange="registrarAsistenciaRapido(${miembro.id}, '${grupo}', 'presente', this)">
            <span class="checkbox-visual-tabla">✓</span>
          </label>
        </td>
        <td style="text-align: center;">
          <label class="checkbox-tabla ausente" title="Ausente">
            <input type="checkbox" onchange="registrarAsistenciaRapido(${miembro.id}, '${grupo}', 'ausente', this)">
            <span class="checkbox-visual-tabla">✗</span>
          </label>
        </td>
        <td style="text-align: center;">
          <label class="checkbox-tabla justificado" title="Justificado">
            <input type="checkbox" onchange="registrarAsistenciaRapido(${miembro.id}, '${grupo}', 'justificado', this)">
            <span class="checkbox-visual-tabla">?</span>
          </label>
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

// ===== REGISTRAR ASISTENCIA RÁPIDO (SIN MODAL) =====
async function registrarAsistenciaRapido(miembroId, grupo, tipo, checkbox) {
  // Desmarcar otros checkboxes de la misma fila
  const row = checkbox.closest('tr');
  const checkboxes = row.querySelectorAll('input[type="checkbox"]');
  
  checkboxes.forEach(cb => {
    if (cb !== checkbox) cb.checked = false;
  });
  
  // Si está desmarcando, no hacer nada
  if (!checkbox.checked) {
    return;
  }
  
  const fecha = grupo === 'coro' 
    ? document.getElementById('fechaCoro').value 
    : document.getElementById('fechaOrquesta').value;
  const tipoEvento = grupo === 'coro' 
    ? document.getElementById('tipoEventoCoro').value 
    : document.getElementById('tipoEventoOrquesta').value;
  
  // Determinar si presente y nota
  let presente;
  let nota = '';
  
  if (tipo === 'presente') {
    presente = true;
  } else if (tipo === 'ausente') {
    presente = false;
  } else if (tipo === 'justificado') {
    presente = null;
    nota = 'Justificado';
  }
  
  // Agregar animación de guardando
  const label = checkbox.closest('.checkbox-tabla');
  label.classList.add('saving');
  
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
      mostrarToast('Asistencia registrada', 'success');
      label.classList.remove('saving');
    } else {
      checkbox.checked = false;
      mostrarError(data.error || 'Error al registrar');
      label.classList.remove('saving');
    }
  } catch (error) {
    console.error('Error:', error);
    checkbox.checked = false;
    mostrarError('Error al registrar asistencia');
    label.classList.remove('saving');
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