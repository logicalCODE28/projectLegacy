export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

  try {
    // forward the full path (supports /api/tasks, /api/tasks/search, /api/tasks/:id)
    const target = `${backend}/api/tasks${req.url.replace('/api/tasks', '')}`
    const opts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET','DELETE'].includes(req.method) ? undefined : JSON.stringify(req.body)
    }

    const r = await fetch(target, opts)
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')){
      const data = await r.json()
      return res.status(r.status).json(data)
    }
    // fallback to binary/text (csv, etc)
    const buffer = await r.arrayBuffer()
    res.status(r.status)
    if (ct) res.setHeader('Content-Type', ct)
    return res.send(Buffer.from(buffer))

    res.setHeader('Allow', 'GET,POST,PUT,DELETE');
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('proxy /api/tasks error', err);
    res.status(500).json({ error: 'proxy_error', details: String(err) });
  }
}
