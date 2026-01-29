export default function TaskCard({ task }) {
  const title = task.title || task._id || 'Sin título'
  const status = task.status || 'Pendiente'
  const priority = task.priority || 'Media'
  const project = task.projectId || task.projectName || 'Sin proyecto'
  const assigned = task.assignedTo || task.assignedName || 'Sin asignar'
  const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha'

  const badgeColor = (s) => {
    if (s === 'Completada') return 'green'
    if (s === 'En Progreso') return '#0ea5e9'
    if (s === 'Bloqueada') return '#f97316'
    return '#ef4444' // Pendiente / default
  }

  return (
    <article className="task-card">
      <div className="task-card-header">
        <h3>{title}</h3>
        <div className="badges">
          <span className="badge" style={{ background: badgeColor(status) }}>{status}</span>
          <span className="badge small">{priority}</span>
        </div>
      </div>
      <p className="task-desc">{task.description || ''}</p>
      <div className="task-meta">
        <span>Proyecto: <strong>{project}</strong></span>
        <span>Asignado: <strong>{assigned}</strong></span>
        <span>Vence: <strong>{due}</strong></span>
      </div>
      <style jsx>{`
        .task-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.06); display:flex; flex-direction:column; gap:10px }
        .task-card-header { display:flex; justify-content:space-between; align-items:center }
        .badges { display:flex; gap:8px }
        .badge { color:#fff; padding:6px 10px; border-radius:999px; font-size:12px }
        .badge.small { opacity:0.9; background:#6b7280 }
        .task-desc { color:#374151; min-height:36px }
        .task-meta { display:flex; gap:12px; font-size:13px; color:#6b7280; justify-content:space-between }
        @media (max-width:720px) { .task-meta { flex-direction:column; gap:6px } }
      `}</style>
    </article>
  )
}
