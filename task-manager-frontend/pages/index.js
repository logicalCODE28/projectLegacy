import React, { useEffect, useState } from 'react'
import Head from 'next/head'

const defaultTab = 'tasks'

export default function Home() {
  const [tab, setTab] = useState(defaultTab)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments, setComments] = useState([])

  useEffect(() => {
    refreshAll()
    if (typeof window !== 'undefined') { const cu = localStorage.getItem('currentUser'); if (cu) setCurrentUser(JSON.parse(cu)); }
  }, [])

  // helper to refresh data
  const refreshAll = async () => {
    try {
      const [u, p, t] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json())
      ])
      setUsers(u); setProjects(p); setTasks(t);
    } catch (e) { }
  }

  const logout = () => { localStorage.removeItem('currentUser'); localStorage.removeItem('currentUserId'); setCurrentUser(null) }

  // Safe output to the shared textarea used by several tabs
  const setOutput = (text) => {
    try {
      const el = typeof document !== 'undefined' && document.querySelector('.modern-textarea')
      if (el) el.value = text
    } catch (e) { /* ignore in SSR */ }
  }

  // Resolve a legacy task identifier: either a numeric index (1-based shown in UI) or a real id/_id
  const resolveTaskId = (raw) => {
    if (!raw) return raw
    // numeric index -> map to tasks array (1-based)
    if (/^[0-9]+$/.test(String(raw))) {
      const idx = Number(raw) - 1
      if (tasks && tasks[idx]) return tasks[idx]._id || tasks[idx].id || raw
    }
    return raw
  }

  // Handlers
  const addTask = async (payload) => {
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (r.ok) { await refreshAll(); alert('Tarea agregada'); setTab('tasks'); setSelectedTask(null); }
    else { const e = await r.text(); alert('Error: ' + e) }
  }

  const updateTask = async (id, payload) => {
    const r = await fetch('/api/tasks/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) { alert('Tarea actualizada'); await refreshAll(); } else { alert('Error al actualizar') }
  }

  const deleteTask = async (id) => {
    if (!confirm('Eliminar tarea?')) return;
    const r = await fetch('/api/tasks/' + id, { method: 'DELETE' });
    if (r.ok) { alert('Tarea eliminada'); await refreshAll(); setSelectedTask(null); } else alert('Error al eliminar')
  }

  // Comments
  const addComment = async () => {
    const raw = document.getElementById('commentTaskId').value; const text = document.getElementById('commentText').value;
    if (!raw || !text) return alert('ID y texto requeridos');
    const taskId = resolveTaskId(raw)
    const r = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, userId: (currentUser && (currentUser.id || currentUser._id)) || '', commentText: text }) });
    if (r.ok) { alert('Comentario agregado'); document.getElementById('commentText').value = ''; await loadComments(); } else alert('Error');
  }

  const loadComments = async () => {
    const raw = document.getElementById('commentTaskId').value; if (!raw) return alert('ID requerido');
    const taskId = resolveTaskId(raw)
    const r = await fetch('/api/comments/task/' + taskId);
    if (r.ok) { const list = await r.json(); setComments(list.reverse()); } else alert('Error al cargar');
  }

  // History
  const loadHistory = async () => {
    const raw = document.getElementById('historyTaskId').value; if (!raw) return alert('ID requerido');
    const taskId = resolveTaskId(raw)
    const r = await fetch('/api/history/task/' + taskId);
    if (r.ok) { const list = await r.json(); setOutput(list.map(h => `${new Date(h.timestamp).toLocaleString()} - ${h.action}\n  Usuario: ${users.find(u => u.id === h.userId || u._id === h.userId)?.username || 'Desconocido'}\n  Antes: ${h.oldValue || '(vacío)'}\n  Después: ${h.newValue || '(vacío)'}`).join('\n---\n')); }
  }

  const loadAllHistory = async () => {
    const r = await fetch('/api/history'); if (r.ok) { const list = await r.json(); setOutput(list.slice(-100).reverse().map(h => `Tarea #${h.taskId} - ${h.action} - ${new Date(h.timestamp).toLocaleDateString()}\n Usuario: ${users.find(u => u.id === h.userId || u._id === h.userId)?.username || 'Desconocido'}`).join('\n---\n')); }
  }

  // Notifications
  const loadNotifications = async () => {
    if (!currentUser) return alert('Login requerido');
    const id = currentUser.id || currentUser._id; const r = await fetch('/api/notifications/user/' + id + '/unread');
    if (r.ok) { const list = await r.json(); setOutput(list.map(n => `[${new Date(n.createdAt).toLocaleString()}] [${n.type}] ${n.message}`).join('\n')); } else alert('Error');
  }

  const markNotificationsRead = async () => {
    if (!currentUser) return alert('Login requerido');
    const id = currentUser.id || currentUser._id; const r = await fetch('/api/notifications/user/' + id + '/markread', { method: 'POST' });
    if (r.ok) { alert('Marcadas como leídas'); setOutput(''); } else alert('Error');
  }

  // Search
  const searchTasks = async () => {
    const q = document.getElementById('searchText').value; const status = document.getElementById('searchStatus').value; const priority = document.getElementById('searchPriority').value; const projectId = document.getElementById('searchProject').value;
    const params = new URLSearchParams(); if (q) params.set('q', q); if (status) params.set('status', status); if (priority) params.set('priority', priority); if (projectId) params.set('projectId', projectId);
    const r = await fetch('/api/tasks/search?' + params.toString());
    if (r.ok) {
      const list = await r.json();
      setOutput(list.map(t => `${t.title} | ${t.status} | ${t.priority} | ${projects.find(p => p._id === t.projectId || p.id === t.projectId)?.name || t.projectId}`).join('\n'))
    } else alert('Error en búsqueda')
  }


  // Reports
  const reportTasks = async () => {
    const r = await fetch('/api/reports/tasks-by-status');
    if (r.ok) { const j = await r.json(); setOutput(Object.entries(j).map(x => `${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const reportProjects = async () => {
    const r = await fetch('/api/reports/projects-count');
    if (r.ok) { const j = await r.json(); setOutput(Object.entries(j).map(x => `${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const reportUsers = async () => {
    const r = await fetch('/api/reports/users-count');
    if (r.ok) { const j = await r.json(); setOutput(Object.entries(j).map(x => `${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const exportCsv = async () => { const r = await fetch('/api/reports/export/tasks/csv'); if (r.ok) { const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'export_tasks.csv'; a.click(); URL.revokeObjectURL(url); } }

  // Simple renderers for each legacy section
  return (
    <div className="layout">
      <Head><title>Task Manager Pro</title></Head>

      {/* Sidebar navigation */}
      <aside className="sidebar glass">
        <div className="sidebar-brand heading-font">TM Pro</div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
            <span className="icon">📋</span> Tareas
          </button>
          <button className={`nav-item ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
            <span className="icon">📁</span> Proyectos
          </button>
          <button className={`nav-item ${tab === 'comments' ? 'active' : ''}`} onClick={() => setTab('comments')}>
            <span className="icon">💬</span> Comentarios
          </button>
          <button className={`nav-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <span className="icon">📜</span> Historial
          </button>
          <button className={`nav-item ${tab === 'notifications' ? 'active' : ''}`} onClick={() => setTab('notifications')}>
            <span className="icon">🔔</span> Notificaciones
          </button>
          <button className={`nav-item ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            <span className="icon">🔍</span> Búsqueda
          </button>
          <button className={`nav-item ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
            <span className="icon">📊</span> Reportes
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{(currentUser?.username || 'G')[0].toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{currentUser?.username || 'Invitado'}</span>
              <button className="logout-btn" onClick={currentUser ? logout : () => { }}>
                {currentUser ? 'Cerrar sesión' : 'Acceder'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <h1 className="heading-font">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
          {!currentUser && (
            <button className="btn-modern btn-primary" onClick={() => { const u = prompt('Usuario', 'admin'); const p = prompt('Contraseña', 'admin'); fetch('/api/users').then(r => r.json()).then(list => { const found = list.find(x => x.username === u && x.password === p); if (found) { localStorage.setItem('currentUser', JSON.stringify(found)); localStorage.setItem('currentUserId', found.id || found._id); setCurrentUser(found); alert('Bienvenido'); refreshAll(); } else alert('Error') }) }}>
              Iniciar Sesión
            </button>
          )}
        </header>

        <section className="content-inner">
          {tab === 'tasks' && (
            <div className="view-container">
              <div className="grid-container">
                <div className="glass-card panel-form">
                  <h3>Detalles de Tarea</h3>
                  <TaskForm users={users} projects={projects} currentUser={currentUser} selectedTask={selectedTask} onCreate={addTask} onUpdate={updateTask} onDelete={deleteTask} onRefresh={refreshAll} />
                </div>

                <div className="glass-card panel-list">
                  <div className="list-header">
                    <h3>Todas las Tareas</h3>
                    <div className="stats-pill">{tasks.length} tareas</div>
                  </div>
                  <div className="table-responsive">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th>Estado</th>
                          <th>Prioridad</th>
                          <th>Proyecto</th>
                          <th>Asignado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t, i) => {
                          const isSelected = selectedTask && (selectedTask._id === t._id || selectedTask.id === t.id);
                          return (
                            <tr key={t.id || t._id} onClick={() => setSelectedTask(t)} className={isSelected ? 'selected' : ''}>
                              <td>#{i + 1}</td>
                              <td className="font-bold">{t.title}</td>
                              <td><span className={`status-badge ${t.status?.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                              <td><span className={`priority-badge ${t.priority?.toLowerCase()}`}>{t.priority}</span></td>
                              <td>{projects.find(p => p.id === t.projectId || p._id === t.projectId)?.name || '—'}</td>
                              <td>{users.find(u => u.id === t.assignedTo || u._id === t.assignedTo)?.username || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <div className="view-container">
              <div className="grid-container">
                <div className="glass-card panel-form">
                  <h3>Proyecto</h3>
                  <div className="form-group"><label>Nombre</label><input id="projectName" className="modern-input" placeholder="Ej: Rediseño UI" /></div>
                  <div className="form-group"><label>Descripción</label><textarea id="projectDesc" className="modern-input" placeholder="Descripción del proyecto..." /></div>
                  <div className="form-actions">
                    <button className="btn-modern btn-primary" onClick={async () => { const name = document.getElementById('projectName').value; const desc = document.getElementById('projectDesc').value; if (!name) return alert('Nombre requerido'); const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) }); if (r.ok) { alert('Agregado'); await refreshAll(); } }}>Agregar</button>
                    <button className="btn-modern btn-secondary" onClick={async () => { const name = document.getElementById('projectName').value; if (!name) return alert('Selecciona'); const p = projects.find(x => x.name === name); if (!p) return alert('No encontrado'); const desc = document.getElementById('projectDesc').value; const id = p._id || p.id; const r = await fetch('/api/projects/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) }); if (r.ok) { alert('Actualizado'); await refreshAll(); } }}>Actualizar</button>
                  </div>
                </div>
                <div className="glass-card panel-list">
                  <table className="modern-table">
                    <thead><tr><th>#</th><th>Nombre</th><th>Descripción</th></tr></thead>
                    <tbody>{projects.map((p, i) => <tr key={p._id || p.id} onClick={() => { document.getElementById('projectName').value = p.name; document.getElementById('projectDesc').value = p.description || '' }}><td>{i + 1}</td><td className="font-bold">{p.name}</td><td>{p.description}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'comments' && (
            <div className="view-container single-col">
              <div className="glass-card">
                <h3>Comentarios de Tarea</h3>
                <div className="form-inline">
                  <input id="commentTaskId" className="modern-input" placeholder="ID de Tarea" />
                  <button className="btn-modern btn-secondary" onClick={loadComments}>Cargar</button>
                </div>
                <div className="form-group mt-4">
                  <textarea id="commentText" className="modern-textarea" placeholder="Escribe un comentario..." style={{ height: 100 }} />
                </div>
                <button className="btn-modern btn-primary mt-2" onClick={addComment}>Enviar Comentario</button>

                <div className="comment-feed mt-4">
                  {comments.length > 0 ? (
                    comments.map((c, i) => (
                      <div key={c._id || c.id || i} className="comment-bubble glass">
                        <div className="comment-header">
                          <span className="comment-author">{users.find(u => u.id === c.userId || u._id === c.userId)?.username || 'Usuario'}</span>
                          <span className="comment-date">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="comment-body">{c.commentText}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No hay comentarios para esta tarea.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="view-container single-col">
              <div className="glass-card">
                <h3>Historial de Cambios</h3>
                <div className="form-inline">
                  <input id="historyTaskId" className="modern-input" placeholder="ID de Tarea" />
                  <button className="btn-modern btn-secondary" onClick={loadHistory}>Ver Historia</button>
                  <button className="btn-modern btn-secondary" onClick={loadAllHistory}>Ver Todo</button>
                </div>
                <textarea className="modern-textarea mt-4" readOnly></textarea>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="view-container single-col">
              <div className="glass-card">
                <h3>Mis Notificaciones</h3>
                <div className="form-actions">
                  <button className="btn-modern btn-primary" onClick={loadNotifications}>Actualizar</button>
                  <button className="btn-modern btn-secondary" onClick={markNotificationsRead}>Marcar todo como leído</button>
                </div>
                <textarea className="modern-textarea mt-4" readOnly></textarea>
              </div>
            </div>
          )}

          {tab === 'search' && (
            <div className="view-container single-col">
              <div className="glass-card">
                <h3>Criterios de Búsqueda</h3>
                <div className="search-grid">
                  <div className="form-group"><label>Texto</label><input id="searchText" className="modern-input" /></div>
                  <div className="form-group"><label>Estado</label><select id="searchStatus" className="modern-input"><option value="">Todos</option><option>Pendiente</option><option>En Progreso</option><option>Completada</option></select></div>
                  <div className="form-group"><label>Prioridad</label><select id="searchPriority" className="modern-input"><option value="">Todos</option><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
                  <div className="form-group"><label>Proyecto</label><select id="searchProject" className="modern-input"><option value="">Todos</option>{projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}</select></div>
                </div>
                <button className="btn-modern btn-primary mt-4" onClick={searchTasks}>Buscar Ahora</button>
                <textarea className="modern-textarea mt-4" readOnly></textarea>
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="view-container single-col">
              <div className="glass-card">
                <h3>Analítica y Reportes</h3>
                <div className="report-actions">
                  <button className="btn-modern btn-secondary" onClick={reportTasks}>Tareas por Estado</button>
                  <button className="btn-modern btn-secondary" onClick={reportProjects}>Tareas por Proyecto</button>
                  <button className="btn-modern btn-secondary" onClick={reportUsers}>Tareas por Usuario</button>
                  <button className="btn-modern btn-primary" onClick={exportCsv}>💾 Exportar CSV</button>
                </div>
                <textarea className="modern-textarea mt-4" readOnly></textarea>
              </div>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .layout { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
        
        .sidebar { width: 280px; display: flex; flex-direction: column; padding: 24px; z-index: 10; }
        .sidebar-brand { font-size: 24px; font-weight: 700; color: var(--accent-primary); margin-bottom: 40px; }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .nav-item { background: transparent; border: none; padding: 12px 16px; border-radius: 12px; color: var(--text-secondary); cursor: pointer; text-align: left; transition: var(--transition); display: flex; align-items: center; gap: 12px; font-size: 15px; }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .nav-item.active { background: rgba(56, 189, 248, 0.1); color: var(--accent-primary); font-weight: 600; }
        .sidebar-footer { margin-top: auto; padding-top: 24px; border-top: 1px solid var(--glass-border); }
        .user-profile { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
        .user-info { display: flex; flex-direction: column; }
        .user-name { font-size: 14px; font-weight: 500; }
        .logout-btn { background: none; border: none; color: var(--text-secondary); font-size: 11px; cursor: pointer; text-align: left; padding: 0; }
        .logout-btn:hover { color: #ef4444; }

        .main-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; }
        .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .top-header h1 { font-size: 32px; font-weight: 700; }

        .content-inner { display: flex; flex-direction: column; gap: 24px; }
        .view-container { animation: fadeIn 0.4s ease-out; }
        .grid-container { display: grid; grid-template-columns: 350px 1fr; gap: 24px; }
        @media (max-width: 1100px) { .grid-container { grid-template-columns: 1fr; } }
        
        .glass-card { background: var(--glass-bg); backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 20px; padding: 24px; }
        .glass-card h3 { margin-bottom: 20px; font-size: 18px; color: var(--text-primary); }
        
        .modern-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .modern-table th { text-align: left; padding: 12px; color: var(--text-secondary); font-size: 13px; font-weight: 500; }
        .modern-table td { padding: 16px 12px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); }
        .modern-table td:first-child { border-left: 1px solid var(--glass-border); border-radius: 12px 0 0 12px; }
        .modern-table td:last-child { border-right: 1px solid var(--glass-border); border-radius: 0 12px 12px 0; }
        .modern-table tr { cursor: pointer; transition: var(--transition); }
        .modern-table tr:hover td { background: rgba(255,255,255,0.05); }
        .modern-table tr.selected td { background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.3); }

        .status-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
        .status-badge.pendiente { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-badge.en-progreso { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
        .status-badge.completada { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        
        .priority-badge { font-size: 12px; color: var(--text-secondary); }
        .priority-badge.alta, .priority-badge.crítica { color: #ef4444; font-weight: 600; }

        .font-bold { font-weight: 600; }
        
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 8px; font-size: 13px; color: var(--text-secondary); }
        .form-inline { display: flex; gap: 12px; align-items: center; }
        .mt-2 { margin-top: 8px; }
        .mt-4 { margin-top: 16px; }
        .font-bold { font-weight: 600; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .comment-feed { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 8px; }
        .comment-bubble { padding: 16px; border-radius: 16px; border-top-left-radius: 4px; border: 1px solid var(--glass-border); position: relative; }
        .comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .comment-author { font-weight: 600; font-size: 14px; color: var(--accent-primary); }
        .comment-date { font-size: 11px; color: var(--text-secondary); }
        .comment-body { font-size: 14px; line-height: 1.5; color: var(--text-primary); }
        .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); font-style: italic; }
      `}</style>
    </div>
  )
}

function TaskForm({ users, projects, onCreate, onUpdate, onDelete, currentUser, selectedTask, onRefresh }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Pendiente')
  const [priority, setPriority] = useState('Media')
  const [projectId, setProjectId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hours, setHours] = useState('')

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title || '')
      setDescription(selectedTask.description || '')
      setStatus(selectedTask.status || 'Pendiente')
      setPriority(selectedTask.priority || 'Media')
      setProjectId(selectedTask.projectId || '')
      setAssignedTo(selectedTask.assignedTo || '')
      setDueDate(selectedTask.dueDate ? (new Date(selectedTask.dueDate)).toISOString().split('T')[0] : '')
      setHours(selectedTask.estimatedHours ? String(selectedTask.estimatedHours) : '')
    } else {
      if (projects && projects.length) setProjectId(projects[0]._id || projects[0].id || '')
    }
  }, [selectedTask, projects])

  const clear = () => { setTitle(''); setDescription(''); setStatus('Pendiente'); setPriority('Media'); setProjectId(projects[0]?._id || projects[0]?.id || ''); setAssignedTo(''); setDueDate(''); setHours(''); if (onRefresh) onRefresh(); }

  const submitCreate = () => {
    if (!title) return alert('El título es requerido');
    const payload = { title, description, status, priority, projectId: projectId || null, assignedTo: assignedTo || null, dueDate: dueDate ? new Date(dueDate).toISOString() : null, estimatedHours: Number(hours) || 0, createdBy: currentUser ? (currentUser.id || currentUser._id) : '' }
    onCreate && onCreate(payload)
  }

  const submitUpdate = () => {
    if (!selectedTask) return alert('Selecciona una tarea');
    const payload = { title, description, status, priority, projectId: projectId || null, assignedTo: assignedTo || null, dueDate: dueDate ? new Date(dueDate).toISOString() : null, estimatedHours: Number(hours) || 0, createdBy: selectedTask.createdBy || (currentUser ? (currentUser.id || currentUser._id) : '') }
    onUpdate && onUpdate(selectedTask._id || selectedTask.id, payload)
  }

  const submitDelete = () => {
    if (!selectedTask) return alert('Selecciona una tarea'); onDelete && onDelete(selectedTask._id || selectedTask.id)
  }

  return (
    <div className="task-form-modern">
      <div className="form-group"><label>Título</label><input type="text" className="modern-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Tarea de ejemplo" /></div>
      <div className="form-group"><label>Descripción</label><textarea className="modern-textarea" style={{ height: 100 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalla la tarea..." /></div>

      <div className="form-grid">
        <div className="form-group"><label>Estado</label><select className="modern-select" value={status} onChange={e => setStatus(e.target.value)}><option>Pendiente</option><option>En Progreso</option><option>Completada</option><option>Bloqueada</option><option>Cancelada</option></select></div>
        <div className="form-group"><label>Prioridad</label><select className="modern-select" value={priority} onChange={e => setPriority(e.target.value)}><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
      </div>

      <div className="form-grid">
        <div className="form-group"><label>Proyecto</label><select className="modern-select" value={projectId} onChange={e => setProjectId(e.target.value)}><option value="">Ninguno</option>{projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}</select></div>
        <div className="form-group"><label>Asignado a</label><select className="modern-select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}><option value="">Sin asignar</option>{users.map(u => <option key={u._id || u.id} value={u._id || u.id}>{u.username}</option>)}</select></div>
      </div>

      <div className="form-grid">
        <div className="form-group"><label>Vencimiento</label><input type="date" className="modern-input" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div className="form-group"><label>Horas</label><input type="number" step="0.5" className="modern-input" value={hours} onChange={e => setHours(e.target.value)} /></div>
      </div>

      <div className="form-actions-footer">
        <button className="btn-modern btn-primary w-full" onClick={submitCreate}>Guardar Nueva</button>
        <div className="form-actions-row">
          <button className="btn-modern btn-secondary flex-1" onClick={submitUpdate}>Actualizar</button>
          <button className="btn-modern btn-secondary danger" onClick={submitDelete}>X</button>
          <button className="btn-modern btn-secondary" onClick={clear}>↺</button>
        </div>
      </div>
      <style jsx>{`
        .task-form-modern { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-actions-footer { margin-top: 8px; display: flex; flex-direction: column; gap: 10px; }
        .form-actions-row { display: flex; gap: 10px; }
        .flex-1 { flex: 1; }
        .w-full { width: 100%; }
        .btn-modern { min-height: 42px; width: 100%; justify-content: center; }
        .danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
        .danger:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
      `}</style>
    </div>
  )
}
