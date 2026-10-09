import { refreshWidget } from './refresh-metadata.js'

// On-demand metadata for a single URL (read-only, no DB writes).
// Used by the "Imagen de fondo" toggle so turning it on can fetch the
// cover right away. Same-origin fetch from the app, no auth needed for a
// GET; this only inspects public pages, like Microlink does.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    return res.status(204).end()
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const url = String(req.query?.url || req.body?.url || '').trim()
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'a valid http(s) url is required' })
  }

  try {
    const row = await refreshWidget({ content: url })
    if (!row) return res.status(200).json({ found: false })

    return res.status(200).json({
      found: true,
      platform: row.platform,
      title: row.title,
      description: row.description,
      image_url: row.image_url,
      favicon_url: row.favicon_url
    })
  } catch (e) {
    return res.status(200).json({ found: false, error: String(e.message || e) })
  }
}