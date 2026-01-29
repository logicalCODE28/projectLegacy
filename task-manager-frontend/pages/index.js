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

  useEffect(()=>{
    refreshAll()
    if (typeof window !== 'undefined'){ const cu = localStorage.getItem('currentUser'); if (cu) setCurrentUser(JSON.parse(cu)); }
  }, [])

  // helper to refresh data
  const refreshAll = async ()=>{
    try{
      const [u,p,t] = await Promise.all([
        fetch('/api/users').then(r=>r.json()),
        fetch('/api/projects').then(r=>r.json()),
        fetch('/api/tasks').then(r=>r.json())
      ])
      setUsers(u); setProjects(p); setTasks(t);
    }catch(e){ }
  }

  const logout = ()=>{ localStorage.removeItem('currentUser'); localStorage.removeItem('currentUserId'); setCurrentUser(null) }

  // Safe output to the shared textarea used by several tabs
  const setOutput = (text)=>{
    try{
      const el = typeof document !== 'undefined' && document.querySelector('.big-textarea')
      if(el) el.value = text
    }catch(e){ /* ignore in SSR */ }
  }

  // Resolve a legacy task identifier: either a numeric index (1-based shown in UI) or a real id/_id
  const resolveTaskId = (raw)=>{
    if(!raw) return raw
    // numeric index -> map to tasks array (1-based)
    if(/^[0-9]+$/.test(String(raw))){
      const idx = Number(raw) - 1
      if(tasks && tasks[idx]) return tasks[idx]._id || tasks[idx].id || raw
    }
    return raw
  }

  // Handlers
  const addTask = async (payload)=>{
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify(payload)})
    if (r.ok) { await refreshAll(); alert('Tarea agregada'); setTab('tasks'); setSelectedTask(null); }
    else { const e = await r.text(); alert('Error: '+e) }
  }

  const updateTask = async (id, payload)=>{
    const r = await fetch('/api/tasks/'+id, { method: 'PUT', headers:{ 'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if (r.ok){ alert('Tarea actualizada'); await refreshAll(); } else { alert('Error al actualizar') }
  }

  const deleteTask = async (id)=>{
    if (!confirm('Eliminar tarea?')) return;
    const r = await fetch('/api/tasks/'+id, { method: 'DELETE' });
    if (r.ok){ alert('Tarea eliminada'); await refreshAll(); setSelectedTask(null); } else alert('Error al eliminar')
  }

  // Comments
  const addComment = async ()=>{
    const taskId=document.getElementById('commentTaskId').value; const text=document.getElementById('commentText').value;
    if(!taskId||!text) return alert('ID y texto requeridos');
    const r=await fetch('/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId,userId: (currentUser && (currentUser.id||currentUser._id)) || '', commentText:text})});
    if(r.ok){ alert('Comentario agregado'); document.getElementById('commentText').value=''; } else alert('Error');
  }

  const loadComments = async ()=>{
  const raw=document.getElementById('commentTaskId').value; if(!raw) return alert('ID requerido');
  const taskId = resolveTaskId(raw)
  const r=await fetch('/api/comments/task/'+taskId);
  if(r.ok){ const list=await r.json(); setOutput(list.map(c=>`[${new Date(c.createdAt).toLocaleString()}] ${users.find(u=>u.id===c.userId||u._id===c.userId)?.username||'Usuario'}: ${c.commentText}`).join('\n---\n')); } else alert('Error al cargar');
  }

  // History
  const loadHistory = async ()=>{
  const raw=document.getElementById('historyTaskId').value; if(!raw) return alert('ID requerido');
  const taskId = resolveTaskId(raw)
  const r=await fetch('/api/history/task/'+taskId);
  if(r.ok){ const list=await r.json(); setOutput(list.map(h=>`${new Date(h.timestamp).toLocaleString()} - ${h.action}\n  Usuario: ${users.find(u=>u.id===h.userId||u._id===h.userId)?.username||'Desconocido'}\n  Antes: ${h.oldValue||'(vacío)'}\n  Después: ${h.newValue||'(vacío)'}`).join('\n---\n')); }
  }

  const loadAllHistory = async ()=>{
    const r=await fetch('/api/history'); if(r.ok){ const list=await r.json(); setOutput(list.slice(-100).reverse().map(h=>`Tarea #${h.taskId} - ${h.action} - ${new Date(h.timestamp).toLocaleDateString()}\n Usuario: ${users.find(u=>u.id===h.userId||u._id===h.userId)?.username||'Desconocido'}`).join('\n---\n')); }
  }

  // Notifications
  const loadNotifications = async ()=>{
    if(!currentUser) return alert('Login requerido');
    const id = currentUser.id||currentUser._id; const r = await fetch('/api/notifications/user/'+id+'/unread');
  if(r.ok){ const list = await r.json(); setOutput(list.map(n=>`[${new Date(n.createdAt).toLocaleString()}] [${n.type}] ${n.message}`).join('\n')); } else alert('Error');
  }

  const markNotificationsRead = async ()=>{
    if(!currentUser) return alert('Login requerido');
    const id = currentUser.id||currentUser._id; const r = await fetch('/api/notifications/user/'+id+'/markread',{method:'POST'});
  if(r.ok){ alert('Marcadas como leídas'); setOutput(''); } else alert('Error');
  }

  // Search
  const searchTasks = async ()=>{
    const q=document.getElementById('searchText').value; const status=document.getElementById('searchStatus').value; const priority=document.getElementById('searchPriority').value; const projectId=document.getElementById('searchProject').value;
    const params = new URLSearchParams(); if(q) params.set('q',q); if(status) params.set('status',status); if(priority) params.set('priority',priority); if(projectId) params.set('projectId',projectId);
    const r=await fetch('/api/tasks/search?'+params.toString());
    if(r.ok){
      const list=await r.json();
      setOutput(list.map(t=>`${t.title} | ${t.status} | ${t.priority} | ${projects.find(p=>p._id===t.projectId||p.id===t.projectId)?.name||t.projectId}`).join('\n'))
    } else alert('Error en búsqueda')
  }


  // Reports
  const reportTasks = async ()=>{
    const r=await fetch('/api/reports/tasks-by-status');
    if(r.ok){ const j=await r.json(); setOutput(Object.entries(j).map(x=>`${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const reportProjects = async ()=>{
    const r=await fetch('/api/reports/projects-count');
    if(r.ok){ const j=await r.json(); setOutput(Object.entries(j).map(x=>`${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const reportUsers = async ()=>{
    const r=await fetch('/api/reports/users-count');
    if(r.ok){ const j=await r.json(); setOutput(Object.entries(j).map(x=>`${x[0]}: ${x[1]} tareas`).join('\n')) }
  }
  const exportCsv = async ()=>{ const r=await fetch('/api/reports/export/tasks/csv'); if(r.ok){ const blob = await r.blob(); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='export_tasks.csv'; a.click(); URL.revokeObjectURL(url); } }

  // Simple renderers for each legacy section
  return (
    <div className="container">
      <Head><title>Task Manager Legacy</title></Head>
      <div className="header-title">Task Manager Legacy</div>

      <div className="topbar">
        <div className="user">Usuario: <strong>{currentUser? currentUser.username: 'guest'}</strong></div>
        <div>
          {currentUser? <button className="btn" onClick={logout}>Salir</button> : <button className="btn" onClick={()=>{ const u = prompt('Usuario','admin'); const p = prompt('Contraseña','admin'); fetch('/api/users').then(r=>r.json()).then(list=>{ const found = list.find(x=>x.username===u && x.password===p); if (found){ localStorage.setItem('currentUser', JSON.stringify(found)); localStorage.setItem('currentUserId', found.id||found._id); setCurrentUser(found); alert('Login ok') } else alert('Credenciales inválidas')}) }}>Entrar</button> }
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-button ${tab==='tasks'?'active':''}`} onClick={()=>setTab('tasks')}>Tareas</button>
        <button className={`tab-button ${tab==='projects'?'active':''}`} onClick={()=>setTab('projects')}>Proyectos</button>
        <button className={`tab-button ${tab==='comments'?'active':''}`} onClick={()=>setTab('comments')}>Comentarios</button>
        <button className={`tab-button ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>Historial</button>
        <button className={`tab-button ${tab==='notifications'?'active':''}`} onClick={()=>setTab('notifications')}>Notificaciones</button>
        <button className={`tab-button ${tab==='search'?'active':''}`} onClick={()=>setTab('search')}>Búsqueda</button>
        <button className={`tab-button ${tab==='reports'?'active':''}`} onClick={()=>setTab('reports')}>Reportes</button>
      </div>

      <div className="main-section">
        {tab==='tasks' && (
          <div>
            <h3>Gestión de Tareas</h3>
            <div className="panel-box">
              <LegacyTaskForm users={users} projects={projects} currentUser={currentUser} selectedTask={selectedTask} onCreate={addTask} onUpdate={updateTask} onDelete={deleteTask} onRefresh={refreshAll} />
            </div>

            <h4 style={{marginTop:12}}>Lista de Tareas</h4>
            <div className="panel-box">
              <table className="table"><thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Proyecto</th><th>Asignado</th><th>Vencimiento</th></tr></thead>
              <tbody>{tasks.map((t,i)=> {
                const isSelected = selectedTask && (selectedTask._id===t._id || selectedTask.id===t.id);
                return (
                  <tr key={t.id||t._id} onClick={()=>setSelectedTask(t)} style={isSelected?{background:'#eef'}:{}}>
                    <td>{i+1}</td>
                    <td>{t.title}</td>
                    <td>{t.status}</td>
                    <td>{t.priority}</td>
                    <td>{projects.find(p=>p.id===t.projectId||p._id===t.projectId)?.name||''}</td>
                    <td>{users.find(u=>u.id===t.assignedTo||u._id===t.assignedTo)?.username||''}</td>
                    <td>{t.dueDate? new Date(t.dueDate).toLocaleDateString():''}</td>
                  </tr>
                )
              })}</tbody>
              </table>
            </div>
            <div className="stats">Estadísticas: Total: {tasks.length} | ...</div>
          </div>
        )}

        {tab==='projects' && (
          <div>
            <h3>Gestión de Proyectos</h3>
            <div className="panel-box">
              <div className="form-row"><label>Nombre:</label><input id="projectName"/></div>
              <div className="form-row"><label>Descripción:</label><textarea id="projectDesc"/></div>
              <div className="form-actions">
                <button className="btn" onClick={async ()=>{ const name=document.getElementById('projectName').value; const desc=document.getElementById('projectDesc').value; if(!name) return alert('Nombre requerido'); const r=await fetch('/api/projects',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, description: desc }) }); if(r.ok){ alert('Proyecto agregado'); await refreshAll(); } }}>Agregar</button>
                <button className="btn" onClick={async ()=>{ const name=document.getElementById('projectName').value; if(!name) return alert('Selecciona proyecto'); const p = projects.find(x=>x.name===name); if(!p) return alert('Proyecto no encontrado'); const desc=document.getElementById('projectDesc').value; const id = p._id||p.id; const r=await fetch('/api/projects/'+id,{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, description: desc }) }); if(r.ok){ alert('Proyecto actualizado'); await refreshAll(); } }}>Actualizar</button>
                <button className="btn" onClick={async ()=>{ const name=document.getElementById('projectName').value; if(!name) return alert('Selecciona proyecto'); const p = projects.find(x=>x.name===name); if(!p) return alert('Proyecto no encontrado'); if(!confirm('Eliminar proyecto?')) return; const id=p._id||p.id; const r=await fetch('/api/projects/'+id,{ method:'DELETE' }); if(r.ok){ alert('Proyecto eliminado'); await refreshAll(); } }}>Eliminar</button>
              </div>
            </div>

            <div className="panel-box" style={{ marginTop:12 }}>
              <table className="table"><thead><tr><th>#</th><th>Nombre</th><th>Descripción</th></tr></thead>
                <tbody>{projects.map((p,i)=> <tr key={p._id||p.id} onClick={()=>{ document.getElementById('projectName').value = p.name; document.getElementById('projectDesc').value = p.description || '' }}><td>{i+1}</td><td>{p.name}</td><td>{p.description}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='comments' && (
          <div>
            <h3>Comentarios</h3>
            <div className="panel-box">
              <div className="form-row"><label>ID Tarea:</label><input id="commentTaskId"/></div>
              <div className="form-row"><label>Comentario:</label><textarea id="commentText"/></div>
              <div className="form-actions">
                <button className="btn" onClick={addComment}>Agregar Comentario</button>
                <button className="btn" onClick={loadComments}>Cargar Comentarios</button>
              </div>
            </div>
            <textarea className="big-textarea" readOnly></textarea>
          </div>
        )}

        {tab==='history' && (
          <div>
            <h3>Historial</h3>
            <div className="panel-box">
              <div className="form-row"><label>ID Tarea:</label><input id="historyTaskId"/></div>
              <div className="form-actions"><button className="btn" onClick={loadHistory}>Cargar Historial</button>
              <button className="btn" onClick={loadAllHistory}>Cargar Todo el Historial</button></div>
            </div>
            <textarea className="big-textarea" readOnly></textarea>
          </div>
        )}

        {tab==='notifications' && (
          <div>
            <h3>Notificaciones</h3>
            <div className="panel-box">
              <div className="form-actions">
                <button className="btn" onClick={loadNotifications}>Cargar Notificaciones</button>
                <button className="btn" onClick={markNotificationsRead}>Marcar como Leídas</button>
              </div>
            </div>
            <textarea className="big-textarea" readOnly></textarea>
          </div>
        )}

        {tab==='search' && (
          <div>
            <h3>Búsqueda</h3>
            <div className="panel-box">
              <div className="form-row"><label>Texto:</label><input id="searchText"/></div>
              <div className="form-row"><label>Estado:</label><select id="searchStatus"><option value="">Todos</option><option>Pendiente</option><option>En Progreso</option><option>Completada</option></select></div>
              <div className="form-row"><label>Prioridad:</label><select id="searchPriority"><option value="">Todos</option><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
              <div className="form-row"><label>Proyecto:</label><select id="searchProject"><option value="">Todos</option>{projects.map(p=> <option key={p._id||p.id} value={p._id||p.id}>{p.name}</option>)}</select></div>
              <div className="form-actions"><button className="btn" onClick={searchTasks}>Buscar</button></div>
            </div>
              <table className="table"><thead><tr><th>ID</th><th>Título</th><th>Estado</th><th>Prioridad</th><th>Proyecto</th></tr></thead><tbody></tbody></table>
              <textarea className="big-textarea" readOnly></textarea>
          </div>
        )}

        {tab==='reports' && (
          <div>
            <h3>Reportes</h3>
            <div className="panel-box">
              <div className="form-actions">
                <button className="btn" onClick={reportTasks}>Reporte de Tareas</button>
                <button className="btn" onClick={reportProjects}>Reporte de Proyectos</button>
                <button className="btn" onClick={reportUsers}>Reporte de Usuarios</button>
                <button className="btn" onClick={exportCsv}>Exportar a CSV</button>
              </div>
            </div>
            <textarea className="big-textarea" readOnly></textarea>
          </div>
        )}
      </div>
    </div>
  )
}

function LegacyTaskForm({ users, projects, onCreate, onUpdate, onDelete, currentUser, selectedTask, onRefresh }){
  const [title,setTitle]=useState('')
  const [description,setDescription]=useState('')
  const [status,setStatus]=useState('Pendiente')
  const [priority,setPriority]=useState('Media')
  const [projectId,setProjectId]=useState('')
  const [assignedTo,setAssignedTo]=useState('')
  const [dueDate,setDueDate]=useState('')
  const [hours,setHours]=useState('')

  useEffect(()=>{
    if(selectedTask){
      setTitle(selectedTask.title||'')
      setDescription(selectedTask.description||'')
      setStatus(selectedTask.status||'Pendiente')
      setPriority(selectedTask.priority||'Media')
      setProjectId(selectedTask.projectId||'')
      setAssignedTo(selectedTask.assignedTo||'')
      setDueDate(selectedTask.dueDate? (new Date(selectedTask.dueDate)).toISOString().split('T')[0] : '')
      setHours(selectedTask.estimatedHours? String(selectedTask.estimatedHours) : '')
    } else {
      if(projects && projects.length) setProjectId(projects[0]._id||projects[0].id||'')
    }
  },[selectedTask, projects])

  const clear = ()=>{ setTitle(''); setDescription(''); setStatus('Pendiente'); setPriority('Media'); setProjectId(projects[0]?._id||projects[0]?.id||''); setAssignedTo(''); setDueDate(''); setHours(''); if(onRefresh) onRefresh(); }

  const submitCreate = ()=>{
    if(!title) return alert('El título es requerido');
    const payload = { title, description, status, priority, projectId: projectId||null, assignedTo: assignedTo||null, dueDate: dueDate? new Date(dueDate).toISOString():null, estimatedHours: Number(hours)||0, createdBy: currentUser? (currentUser.id||currentUser._id) : '' }
    onCreate && onCreate(payload)
  }

  const submitUpdate = ()=>{
    if(!selectedTask) return alert('Selecciona una tarea');
    const payload = { title, description, status, priority, projectId: projectId||null, assignedTo: assignedTo||null, dueDate: dueDate? new Date(dueDate).toISOString():null, estimatedHours: Number(hours)||0, createdBy: selectedTask.createdBy || (currentUser? (currentUser.id||currentUser._id) : '') }
    onUpdate && onUpdate(selectedTask._id||selectedTask.id, payload)
  }

  const submitDelete = ()=>{
    if(!selectedTask) return alert('Selecciona una tarea'); onDelete && onDelete(selectedTask._id||selectedTask.id)
  }

  return (
    <div>
      <div className="form-row"><label>Título:</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} /></div>
      <div className="form-row"><label>Descripción:</label><textarea value={description} onChange={e=>setDescription(e.target.value)} /></div>
      <div className="form-row"><label>Estado:</label><select value={status} onChange={e=>setStatus(e.target.value)}><option>Pendiente</option><option>En Progreso</option><option>Completada</option><option>Bloqueada</option><option>Cancelada</option></select></div>
      <div className="form-row"><label>Prioridad:</label><select value={priority} onChange={e=>setPriority(e.target.value)}><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></div>
      <div className="form-row"><label>Proyecto:</label><select value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(p=> <option key={p._id||p.id} value={p._id||p.id}>{p.name}</option>)}</select></div>
      <div className="form-row"><label>Asignado a:</label><select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}><option value="">Sin asignar</option>{users.map(u=> <option key={u._id||u.id} value={u._id||u.id}>{u.username}</option>)}</select></div>
      <div className="form-row"><label>Fecha Vencimiento:</label><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
      <div className="form-row"><label>Horas Estimadas:</label><input type="number" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} /></div>
      <div className="form-actions"><button className="btn" onClick={submitCreate}>Agregar</button><button className="btn" onClick={submitUpdate}>Actualizar</button><button className="btn" onClick={submitDelete}>Eliminar</button><button className="btn" onClick={clear}>Limpiar</button></div>
    </div>
  )
}

