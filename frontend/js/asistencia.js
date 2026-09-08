// ===== CARGAR MIEMBROS =====
async function cargarMiembros(grupo) {
    try {
        const response = await fetch(`${API_URL}/asistencia/miembros/${grupo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const miembros = await response.json();
        const container = document.getElementById(`${grupo}List`);
        
        container.innerHTML = '';
        
        miembros.forEach(miembro => {
            const div = document.createElement('div');
            div.className = 'miembro-item';
            div.innerHTML = `
                <span class="miembro-nombre">${miembro.nombre}</span>
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