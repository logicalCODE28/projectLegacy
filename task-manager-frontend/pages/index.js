import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { API_URL } from '../lib/api'

const defaultTab = 'tasks'

export default function Home() {
  const [tab, setTab] = useState(defaultTab)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments, setComments] = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [reportData, setReportData] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [searchPage, setSearchPage] = useState(1)
  const [commentsPage, setCommentsPage] = useState(1)
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [commentsDateFrom, setCommentsDateFrom] = useState('')
  const [commentsDateTo, setCommentsDateTo] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [projectsPage, setProjectsPage] = useState(1)
  const itemsPerPage = 5
  const projectsPerPage = 6

  useEffect(() => {
    refreshAll()
    if (typeof window !== 'undefined') { const cu = localStorage.getItem('currentUser'); if (cu) setCurrentUser(JSON.parse(cu)); }
  }, [])

  // helper to refresh data
  const refreshAll = async () => {
    try {
      const [u, p, t] = await Promise.all([
        fetch(`${API_URL}/api/users`).then(r => r.json()),
        fetch(`${API_URL}/api/projects`).then(r => r.json()),
        fetch(`${API_URL}/api/tasks`).then(r => r.json())
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
    const r = await fetch(`${API_URL}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (r.ok) { await refreshAll(); alert('Tarea agregada'); setTab('tasks'); setSelectedTask(null); }
    else { const e = await r.text(); alert('Error: ' + e) }
  }

  const updateTask = async (id, payload) => {
    const r = await fetch(`${API_URL}/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) { alert('Tarea actualizada'); await refreshAll(); setSelectedTask(null); } else { alert('Error al actualizar') }
  }

  const deleteTask = async (id) => {
    if (!confirm('Eliminar tarea?')) return;
    const r = await fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' });
    if (r.ok) { alert('Tarea eliminada'); await refreshAll(); setSelectedTask(null); } else alert('Error al eliminar')
  }

  // Comments
  const addComment = async () => {
    const raw = document.getElementById('commentTaskId').value; const text = document.getElementById('commentText').value;
    if (!raw || !text) return alert('ID y texto requeridos');
    const taskId = resolveTaskId(raw)
    const r = await fetch(`${API_URL}/api/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId, userId: (currentUser && (currentUser.id || currentUser._id)) || '', commentText: text }) });
    if (r.ok) { alert('Comentario agregado'); document.getElementById('commentText').value = ''; await loadComments(); } else alert('Error');
  }

  const loadComments = async () => {
    const raw = document.getElementById('commentTaskId').value; if (!raw) return alert('ID requerido');
    const taskId = resolveTaskId(raw)
    const r = await fetch(`${API_URL}/api/comments/task/${taskId}`);
    if (r.ok) { const list = await r.json(); setComments(list.reverse()); setCommentsPage(1); } else alert('Error al cargar');
  }

  // History Reset Helper
  const resetHistoryDisplay = (list) => {
    setHistoryItems(list);
    setHistoryPage(1);
  }

  // History
  const loadHistory = async () => {
    const raw = document.getElementById('historyTaskId').value; if (!raw) return alert('ID requerido');
    const taskId = resolveTaskId(raw)
    const r = await fetch(`${API_URL}/api/history/task/${taskId}`);
    if (r.ok) { const list = await r.json(); resetHistoryDisplay(list.reverse()); }
  }

  const loadAllHistory = async () => {
    const r = await fetch(`${API_URL}/api/history`); if (r.ok) { const list = await r.json(); resetHistoryDisplay(list.slice(-100).reverse()); }
  }

  // Notifications
  const loadNotifications = async () => {
    if (!currentUser) return alert('Login requerido');
    const id = currentUser.id || currentUser._id;

    // Load unread notifications
    const unreadRes = await fetch(`${API_URL}/api/notifications/user/${id}/unread`);
    if (unreadRes.ok) {
      const unreadList = await unreadRes.json();
      setNotifications(unreadList);
    }

    // Load all notifications for the toggle feature
    const allRes = await fetch(`${API_URL}/api/notifications/user/${id}`);
    if (allRes.ok) {
      const allList = await allRes.json();
      setAllNotifications(allList);
    }
  }

  const markNotificationsRead = async () => {
    if (!currentUser) return alert('Login requerido');
    const id = currentUser.id || currentUser._id; const r = await fetch(`${API_URL}/api/notifications/user/${id}/markread`, { method: 'POST' });
    if (r.ok) { alert('Marcadas como leídas'); setOutput(''); } else alert('Error');
  }

  // Search
  const searchTasks = async () => {
    const q = document.getElementById('searchText').value; const status = document.getElementById('searchStatus').value; const priority = document.getElementById('searchPriority').value; const projectId = document.getElementById('searchProject').value;
    const params = new URLSearchParams(); if (q) params.set('q', q); if (status) params.set('status', status); if (priority) params.set('priority', priority); if (projectId) params.set('projectId', projectId);
    const r = await fetch(`${API_URL}/api/tasks/search?${params.toString()}`);
    if (r.ok) {
      const list = await r.json();
      setSearchResults(list);
      setSearchPage(1);
    } else alert('Error en búsqueda')
  }


  // Reports
  const reportTasks = async () => {
    const r = await fetch(`${API_URL}/api/reports/tasks-by-status`);
    if (r.ok) { const j = await r.json(); setReportData(Object.entries(j).map(([label, value]) => ({ label: `${label} (Tareas)`, value }))) }
  }
  const reportProjects = async () => {
    const r = await fetch(`${API_URL}/api/reports/projects-count`);
    if (r.ok) { const j = await r.json(); setReportData(Object.entries(j).map(([label, value]) => ({ label, value: `${value} tareas` }))) }
  }
  const reportUsers = async () => {
    const r = await fetch(`${API_URL}/api/reports/users-count`);
    if (r.ok) { const j = await r.json(); setReportData(Object.entries(j).map(([label, value]) => ({ label, value: `${value} tareas` }))) }
  }
  const exportCsv = async () => { const r = await fetch(`${API_URL}/api/reports/export/tasks/csv`); if (r.ok) { const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'export_tasks.csv'; a.click(); URL.revokeObjectURL(url); } }

  // Simple renderers for each legacy section
  return (
    <div className="layout">
      <Head><title>Task Manager Pro</title></Head>

      {!currentUser ? (
        <LoginView onLogin={(user) => {
          localStorage.setItem('currentUser', JSON.stringify(user));
          localStorage.setItem('currentUserId', user.id || user._id);
          setCurrentUser(user);
          refreshAll();
        }} />
      ) : (
        <>
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
                  <button className="logout-btn-premium" onClick={currentUser ? logout : () => { }}>
                    <span className="logout-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </span>
                    {currentUser ? 'Salir' : 'Acceder'}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="main-content">
            <header className="top-header">
              <h1 className="heading-font">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
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
                        <button className="btn-modern btn-primary" onClick={async () => { const name = document.getElementById('projectName').value; const desc = document.getElementById('projectDesc').value; if (!name) return alert('Nombre requerido'); const r = await fetch(`${API_URL}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) }); if (r.ok) { alert('Agregado'); await refreshAll(); } }}>Agregar</button>
                        <button className="btn-modern btn-secondary" onClick={async () => { const name = document.getElementById('projectName').value; if (!name) return alert('Selecciona'); const p = projects.find(x => x.name === name); if (!p) return alert('No encontrado'); const desc = document.getElementById('projectDesc').value; const id = p._id || p.id; const r = await fetch(`${API_URL}/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: desc }) }); if (r.ok) { alert('Actualizado'); await refreshAll(); } }}>Actualizar</button>
                      </div>
                    </div>
                    <div className="glass-card panel-list">
                      {/* Search Filter */}
                      <div className="project-search-bar">
                        <input
                          type="text"
                          className="modern-input"
                          placeholder="🔍 Buscar proyectos..."
                          value={projectSearch}
                          onChange={e => setProjectSearch(e.target.value)}
                        />
                        {projectSearch && (
                          <button
                            className="btn-modern btn-secondary btn-sm"
                            onClick={() => { setProjectSearch(''); setProjectsPage(1); }}
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      <table className="modern-table">
                        <thead><tr><th>#</th><th>Nombre</th><th>Descripción</th></tr></thead>
                        <tbody>
                          {(() => {
                            const filteredProjects = projects.filter(p => {
                              if (!projectSearch) return true;
                              const search = projectSearch.toLowerCase();
                              return (
                                p.name?.toLowerCase().includes(search) ||
                                p.description?.toLowerCase().includes(search)
                              );
                            });

                            return filteredProjects
                              .slice((projectsPage - 1) * projectsPerPage, projectsPage * projectsPerPage)
                              .map((p, i) => (
                                <tr key={p._id || p.id} onClick={() => { document.getElementById('projectName').value = p.name; document.getElementById('projectDesc').value = p.description || '' }}>
                                  <td>{(projectsPage - 1) * projectsPerPage + i + 1}</td>
                                  <td className="font-bold">{p.name}</td>
                                  <td>{p.description}</td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>

                      {/* Pagination for Projects */}
                      {(() => {
                        const filteredProjects = projects.filter(p => {
                          if (!projectSearch) return true;
                          const search = projectSearch.toLowerCase();
                          return (
                            p.name?.toLowerCase().includes(search) ||
                            p.description?.toLowerCase().includes(search)
                          );
                        });

                        return filteredProjects.length > projectsPerPage && (
                          <div className="pagination-bar mt-6">
                            <button
                              className="btn-modern btn-secondary btn-sm"
                              onClick={() => setProjectsPage(p => Math.max(1, p - 1))}
                              disabled={projectsPage === 1}
                            >
                              ← Anterior
                            </button>
                            <div className="page-indicator">
                              {Array.from({ length: Math.ceil(filteredProjects.length / projectsPerPage) }).map((_, i) => (
                                <button
                                  key={i}
                                  className={`page-dot ${projectsPage === i + 1 ? 'active' : ''}`}
                                  onClick={() => setProjectsPage(i + 1)}
                                />
                              ))}
                              <span className="page-text">Página {projectsPage} de {Math.ceil(filteredProjects.length / projectsPerPage)}</span>
                            </div>
                            <button
                              className="btn-modern btn-secondary btn-sm"
                              onClick={() => setProjectsPage(p => Math.min(Math.ceil(filteredProjects.length / projectsPerPage), p + 1))}
                              disabled={projectsPage === Math.ceil(filteredProjects.length / projectsPerPage)}
                            >
                              Siguiente →
                            </button>
                          </div>
                        );
                      })()}
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

                    {/* Date Filter for Comments */}
                    <div className="history-filters mt-4">
                      <div className="filter-group">
                        <label>Desde</label>
                        <input
                          type="date"
                          className="modern-input"
                          value={commentsDateFrom}
                          onChange={e => { setCommentsDateFrom(e.target.value); setCommentsPage(1); }}
                        />
                      </div>
                      <div className="filter-group">
                        <label>Hasta</label>
                        <input
                          type="date"
                          className="modern-input"
                          value={commentsDateTo}
                          onChange={e => { setCommentsDateTo(e.target.value); setCommentsPage(1); }}
                        />
                      </div>
                      {(commentsDateFrom || commentsDateTo) && (
                        <button
                          className="btn-modern btn-secondary btn-sm"
                          onClick={() => { setCommentsDateFrom(''); setCommentsDateTo(''); setCommentsPage(1); }}
                        >
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    <div className="comment-feed mt-4">
                      {(() => {
                        // Apply date filtering
                        let filteredComments = comments;
                        if (commentsDateFrom || commentsDateTo) {
                          filteredComments = comments.filter(c => {
                            const itemDate = new Date(c.createdAt);
                            const fromDate = commentsDateFrom ? new Date(commentsDateFrom) : null;
                            const toDate = commentsDateTo ? new Date(commentsDateTo + 'T23:59:59') : null;

                            if (fromDate && itemDate < fromDate) return false;
                            if (toDate && itemDate > toDate) return false;
                            return true;
                          });
                        }

                        return filteredComments.length > 0 ? (
                          <>
                            {filteredComments.slice((commentsPage - 1) * itemsPerPage, commentsPage * itemsPerPage).map((c, i) => (
                              <div key={c._id || c.id || i} className="comment-bubble glass">
                                <div className="comment-header">
                                  <span className="comment-author">{users.find(u => u.id === c.userId || u._id === c.userId)?.username || 'Usuario'}</span>
                                  <span className="comment-date">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="comment-body">{c.commentText}</div>
                              </div>
                            ))}

                            {/* Pagination Controls for Comments */}
                            {filteredComments.length > itemsPerPage && (
                              <div className="pagination-bar mt-6">
                                <button
                                  className="btn-modern btn-secondary btn-sm"
                                  onClick={() => setCommentsPage(p => Math.max(1, p - 1))}
                                  disabled={commentsPage === 1}
                                >
                                  ← Anterior
                                </button>
                                <div className="page-indicator">
                                  {Array.from({ length: Math.ceil(filteredComments.length / itemsPerPage) }).map((_, i) => (
                                    <button
                                      key={i}
                                      className={`page-dot ${commentsPage === i + 1 ? 'active' : ''}`}
                                      onClick={() => setCommentsPage(i + 1)}
                                    />
                                  ))}
                                  <span className="page-text">Página {commentsPage} de {Math.ceil(filteredComments.length / itemsPerPage)}</span>
                                </div>
                                <button
                                  className="btn-modern btn-secondary btn-sm"
                                  onClick={() => setCommentsPage(p => Math.min(Math.ceil(filteredComments.length / itemsPerPage), p + 1))}
                                  disabled={commentsPage === Math.ceil(filteredComments.length / itemsPerPage)}
                                >
                                  Siguiente →
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="empty-state">No hay comentarios para esta tarea.</div>
                        );
                      })()}
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

                    {/* Date Filter */}
                    <div className="history-filters mt-4">
                      <div className="filter-group">
                        <label>Desde</label>
                        <input
                          type="date"
                          className="modern-input"
                          value={historyDateFrom}
                          onChange={e => { setHistoryDateFrom(e.target.value); setHistoryPage(1); }}
                        />
                      </div>
                      <div className="filter-group">
                        <label>Hasta</label>
                        <input
                          type="date"
                          className="modern-input"
                          value={historyDateTo}
                          onChange={e => { setHistoryDateTo(e.target.value); setHistoryPage(1); }}
                        />
                      </div>
                      {(historyDateFrom || historyDateTo) && (
                        <button
                          className="btn-modern btn-secondary btn-sm"
                          onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); setHistoryPage(1); }}
                        >
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    <div className="history-feed mt-4">
                      {(() => {
                        // Apply date filtering
                        let filteredHistory = historyItems;
                        if (historyDateFrom || historyDateTo) {
                          filteredHistory = historyItems.filter(h => {
                            const itemDate = new Date(h.timestamp);
                            const fromDate = historyDateFrom ? new Date(historyDateFrom) : null;
                            const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;

                            if (fromDate && itemDate < fromDate) return false;
                            if (toDate && itemDate > toDate) return false;
                            return true;
                          });
                        }

                        return filteredHistory.length > 0 ? (
                          <>
                            {filteredHistory.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map((h, i) => (
                              <div key={h._id || h.id || i} className="history-card glass">
                                <div className="history-header">
                                  <div className="history-info">
                                    <span className="history-action">{h.action}</span>
                                    <span className="history-user">por {users.find(u => u.id === h.userId || u._id === h.userId)?.username || 'Desconocido'}</span>
                                  </div>
                                  <span className="history-date">{new Date(h.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="history-details">
                                  <div className="detail-item">
                                    <span className="label">Anterior:</span>
                                    <span className="value old">{h.oldValue || '(vacío)'}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span className="label">Nuevo:</span>
                                    <span className="value new">{h.newValue || '(vacío)'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Pagination Controls */}
                            {filteredHistory.length > itemsPerPage && (
                              <div className="pagination-bar mt-6">
                                <button
                                  className="btn-modern btn-secondary btn-sm"
                                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                  disabled={historyPage === 1}
                                >
                                  ← Anterior
                                </button>
                                <div className="page-indicator">
                                  {Array.from({ length: Math.ceil(filteredHistory.length / itemsPerPage) }).map((_, i) => (
                                    <button
                                      key={i}
                                      className={`page-dot ${historyPage === i + 1 ? 'active' : ''}`}
                                      onClick={() => setHistoryPage(i + 1)}
                                    />
                                  ))}
                                  <span className="page-text">Página {historyPage} de {Math.ceil(filteredHistory.length / itemsPerPage)}</span>
                                </div>
                                <button
                                  className="btn-modern btn-secondary btn-sm"
                                  onClick={() => setHistoryPage(p => Math.min(Math.ceil(filteredHistory.length / itemsPerPage), p + 1))}
                                  disabled={historyPage === Math.ceil(filteredHistory.length / itemsPerPage)}
                                >
                                  Siguiente →
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="empty-state">No hay registros de historial disponibles.</div>
                        );
                      })()}
                    </div>
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

                    <div className="search-feed mt-4">
                      {searchResults.length > 0 ? (
                        <>
                          {searchResults.slice((searchPage - 1) * itemsPerPage, searchPage * itemsPerPage).map((t, i) => (
                            <div key={t._id || t.id || i} className="search-result-card glass" onClick={() => { setTab('tasks'); setSelectedTask(t); }}>
                              <div className="result-main">
                                <span className="result-title">{t.title}</span>
                                <span className="result-project">{projects.find(p => p.id === t.projectId || p._id === t.projectId)?.name || 'Sin Proyecto'}</span>
                              </div>
                              <div className="result-meta">
                                <span className={`status-badge ${t.status?.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
                                <span className={`priority-badge ${t.priority?.toLowerCase()}`}>{t.priority}</span>
                              </div>
                            </div>
                          ))}

                          {/* Pagination Controls for Search */}
                          {searchResults.length > itemsPerPage && (
                            <div className="pagination-bar mt-6">
                              <button
                                className="btn-modern btn-secondary btn-sm"
                                onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                                disabled={searchPage === 1}
                              >
                                ← Anterior
                              </button>
                              <div className="page-indicator">
                                {Array.from({ length: Math.ceil(searchResults.length / itemsPerPage) }).map((_, i) => (
                                  <button
                                    key={i}
                                    className={`page-dot ${searchPage === i + 1 ? 'active' : ''}`}
                                    onClick={() => setSearchPage(i + 1)}
                                  />
                                ))}
                                <span className="page-text">Página {searchPage} de {Math.ceil(searchResults.length / itemsPerPage)}</span>
                              </div>
                              <button
                                className="btn-modern btn-secondary btn-sm"
                                onClick={() => setSearchPage(p => Math.min(Math.ceil(searchResults.length / itemsPerPage), p + 1))}
                                disabled={searchPage === Math.ceil(searchResults.length / itemsPerPage)}
                              >
                                Siguiente →
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="empty-state">Realiza una búsqueda para ver los resultados aquí.</div>
                      )}
                    </div>
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

                    <div className="report-grid mt-4">
                      {reportData.length > 0 ? (
                        reportData.map((item, i) => (
                          <div key={i} className="report-card glass">
                            <span className="report-label">{item.label}</span>
                            <span className="report-value">{item.value}</span>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">Selecciona un reporte para ver las estadísticas.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        </>
      )}

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
        .user-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .logout-btn-premium { 
          background: rgba(239, 68, 68, 0.1); 
          border: 1px solid rgba(239, 68, 68, 0.2); 
          color: #f87171; 
          font-size: 11px; 
          font-weight: 600;
          cursor: pointer; 
          text-align: left; 
          padding: 4px 10px; 
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          width: fit-content;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .logout-btn-premium:hover { 
          background: rgba(239, 68, 68, 0.2); 
          border-color: #ef4444;
          color: #ef4444;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        .logout-btn-premium:active { transform: translateY(0); }
        .logout-icon { display: flex; align-items: center; }

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

        .history-feed { display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; padding-right: 8px; }
        .history-card { padding: 16px; border-radius: 12px; border: 1px solid var(--glass-border); }
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }
        .history-info { display: flex; flex-direction: column; }
        .history-action { font-weight: 700; font-size: 13px; color: var(--accent-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
        .history-user { font-size: 12px; color: var(--text-secondary); }
        .history-date { font-size: 11px; color: var(--text-secondary); }
        .history-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .detail-item { display: flex; flex-direction: column; gap: 4px; }
        .detail-item .label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
        .detail-item .value { font-size: 13px; padding: 8px; border-radius: 6px; background: rgba(0,0,0,0.2); }
        .detail-item .value.old { color: #f87171; border-left: 3px solid #f87171; }
        .detail-item .value.new { color: #4ade80; border-left: 3px solid #4ade80; }

        .history-filters { display: flex; gap: 12px; align-items: flex-end; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--glass-border); }
        .filter-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .filter-group label { font-size: 11px; color: var(--text-secondary); font-weight: 500; text-transform: uppercase; }

        .project-search-bar { display: flex; gap: 12px; align-items: center; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid var(--glass-border); margin-bottom: 16px; }
        .project-search-bar input { flex: 1; }

        .pagination-bar { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border); }
        .page-indicator { display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center; }
        .page-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--glass-border); border: none; padding: 0; cursor: pointer; transition: var(--transition); }
        .page-dot.active { background: var(--accent-primary); box-shadow: 0 0 10px var(--accent-primary); width: 20px; border-radius: 4px; }
        .page-text { font-size: 11px; color: var(--text-secondary); margin-left: 10px; font-weight: 500; text-transform: uppercase; }
        .btn-sm { padding: 8px 16px !important; min-height: 0 !important; width: auto !important; font-size: 11px !important; }
        .mt-6 { margin-top: 24px; }

        .search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .search-feed { display: flex; flex-direction: column; gap: 10px; max-height: 450px; overflow-y: auto; padding-right: 8px; }
        .search-result-card { padding: 14px 18px; border-radius: 12px; border: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: var(--transition); }
        .search-result-card:hover { background: rgba(255,255,255,0.05); transform: translateX(5px); border-color: var(--accent-primary); }
        .result-main { display: flex; flex-direction: column; gap: 4px; }
        .result-title { font-weight: 600; font-size: 15px; color: var(--text-primary); }
        .result-project { font-size: 12px; color: var(--text-secondary); }
        .result-meta { display: flex; align-items: center; gap: 12px; }
        @media (max-width: 600px) { .search-grid { grid-template-columns: 1fr; } .search-result-card { flex-direction: column; align-items: flex-start; gap: 12px; } }

        .report-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .report-card { padding: 24px; border-radius: 16px; border: 1px solid var(--glass-border); display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
        .report-value { font-size: 28px; font-weight: 700; color: var(--accent-primary); }
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
      setTitle('')
      setDescription('')
      setStatus('Pendiente')
      setPriority('Media')
      setAssignedTo('')
      setDueDate('')
      setHours('')
      if (projects && projects.length) setProjectId(projects[0]._id || projects[0].id || '')
      else setProjectId('')
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

function LoginView({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert('Campos obligatorios');
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/users`);
      const list = await r.json();
      const found = list.find(u => u.username === username && u.password === password);
      setTimeout(() => {
        if (found) {
          onLogin(found);
        } else {
          alert('Credenciales inválidas');
          setLoading(false);
        }
      }, 800);
    } catch (err) {
      alert('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-logo heading-font">TM Pro</div>
        <p className="login-subtitle">Eleva tu productividad. <br />Inicia sesión para gestionar tus proyectos.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Nombre de Usuario</label>
            <div className="login-input-wrapper">
              <input type="text" className="modern-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ej: admin" required />
            </div>
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <input type="password" className="modern-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
          </div>
          <button type="submit" className="btn-modern btn-primary mt-4" style={{ height: 50, fontSize: 16 }} disabled={loading}>
            {loading ? 'Validando Acceso...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
      <style jsx>{`
        .login-container { 
          width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; 
          background: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.1) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.1) 0px, transparent 50%);
          position: fixed; top: 0; left: 0; z-index: 100; overflow: hidden;
        }
        .login-card { 
          width: calc(100% - 40px); max-width: 420px; padding: 48px; text-align: center; 
          border-radius: 32px; backdrop-filter: blur(20px); background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1);
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .login-logo { font-size: 40px; font-weight: 800; color: #fff; margin-bottom: 12px; letter-spacing: -1px; }
        .login-subtitle { color: var(--text-secondary); margin-bottom: 40px; font-size: 15px; line-height: 1.6; }
        .login-form { display: flex; flex-direction: column; gap: 24px; }
        .login-field { display: flex; flex-direction: column; gap: 10px; text-align: left; }
        .login-field label { font-size: 12px; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 1px; }
        .login-card .modern-input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; font-size: 16px; transition: all 0.3s ease; }
        .login-card .modern-input:focus { background: rgba(0,0,0,0.4); border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(56, 189, 248, 0.2); }
        .mt-4 { margin-top: 16px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
