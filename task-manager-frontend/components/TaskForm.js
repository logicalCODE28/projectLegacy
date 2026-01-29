import { useState, useEffect } from 'react'

export default function TaskForm({ onClose, onSaved, initial }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [status, setStatus] = useState(initial?.status || 'Pendiente')
  const [priority, setPriority] = useState(initial?.priority || 'Media')
  const [projectId, setProjectId] = useState(initial?.projectId || '')
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo || '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial?.dueDate.split('T')[0] : '')
  const [hours, setHours] = useState(initial?.estimatedHours || 0)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects) }, [])
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers) }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!title) return alert('Título requerido')

    const payload = {
      title,
      description,
      status,
      priority,
      projectId: projectId || null,
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      estimatedHours: Number(hours) || 0,
      createdBy: (typeof window !== 'undefined' && localStorage.getItem('currentUserId')) ? localStorage.getItem('currentUserId') : null
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.ok) {
      onSaved && onSaved()
      onClose && onClose()
    } else {
      const data = await res.json()
      alert('Error: ' + (data?.message || data?.error || res.status))
    }
  }

  return (
    <div className="modal">
      <form className="modal-card" onSubmit={onSubmit}>
        <h3>{initial ? 'Editar tarea' : 'Nueva tarea'}</h3>
        <label>Título<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
        <label>Descripción<textarea value={description} onChange={e=>setDescription(e.target.value)} /></label>
        <label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}>
          <option>Pendiente</option>
          <option>En Progreso</option>
          <option>Completada</option>
        </select></label>
        <label>Prioridad<select value={priority} onChange={e=>setPriority(e.target.value)}>
          <option>Baja</option>
          <option>Media</option>
          <option>Alta</option>
          <option>Crítica</option>
        </select></label>
        <label>Proyecto<select value={projectId} onChange={e=>setProjectId(e.target.value)}>
          <option value="">Sin proyecto</option>
          {projects.map(p=> <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
        </select></label>
        <label>Asignado<select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
          <option value="">Sin asignar</option>
          {users.map(u=> <option key={u.id || u._id} value={u.id || u._id}>{u.username}</option>)}
        </select></label>
        <label>Vencimiento<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label>
        <label>Horas estimadas<input type="number" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} /></label>

        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button type="submit" className="btnPrimary">Guardar</button>
          <button type="button" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
