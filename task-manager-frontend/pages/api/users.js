export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  try {
    const r = await fetch(`${backend}/api/users`);
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    console.error('proxy /api/users error', err);
    res.status(500).json({ error: 'proxy_error' });
  }
}
