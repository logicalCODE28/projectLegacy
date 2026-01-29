export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || 'http://localhost:5000';
  try {
    const target = `${backend}/api/comments${req.url.replace('/api/comments', '')}`
    const opts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET','DELETE'].includes(req.method) ? undefined : JSON.stringify(req.body)
    }

    const r = await fetch(target, opts)
    const ct = r.headers.get('content-type')||''
    if (ct.includes('application/json')){
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    // fallback to text/binary
    const buffer = await r.arrayBuffer()
    res.status(r.status)
    if (ct) res.setHeader('Content-Type', ct)
    return res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('proxy /api/comments error', err)
    res.status(500).json({ error: 'proxy_error', details: String(err) })
  }
}
