export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  try {
    const target = `${backend}/api/history${req.url.replace('/api/history', '')}`
    const opts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET','DELETE'].includes(req.method) ? undefined : JSON.stringify(req.body)
    }
    const r = await fetch(target, opts)
    const data = await r.json()
    return res.status(r.status).json(data)
  } catch (err) {
    console.error('proxy /api/history error', err)
    res.status(500).json({ error: 'proxy_error', details: String(err) })
  }
}
