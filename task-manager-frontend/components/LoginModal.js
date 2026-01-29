import { useState } from 'react'

export default function LoginModal({ onClose, onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')

  const login = async () => {
    // Simple login: call backend users list and match credentials
    try {
      const r = await fetch('/api/users')
      const users = await r.json()
      const u = users.find(x => x.username === username && x.password === password)
      if (u) {
        // store minimal info in localStorage
        localStorage.setItem('currentUser', JSON.stringify(u))
        localStorage.setItem('currentUserId', u.id || u._id)
        onLogin && onLogin(u)
        onClose && onClose()
      } else {
        alert('Credenciales inválidas')
      }
    } catch (err) {
      console.error(err)
      alert('Error en login')
    }
  }

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>Login</h3>
        <label>Usuario<input value={username} onChange={e=>setUsername(e.target.value)} /></label>
        <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button className="btnPrimary" onClick={login}>Entrar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
