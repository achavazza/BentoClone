import { createClient } from '@supabase/supabase-js'

// Env vars (Vercel > Settings > Environment Variables):
//   SUPABASE_URL                = https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   = service_role key (Supabase > Settings > API)
//   CRON_SECRET                 = random string you generate
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const UA = 'Mozilla/5.0 (compatible; BentoPreviewBot/1.0; +link-preview)'
const TIMEOUT_MS = 6000

async function getJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow'
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`)
  return res.json()
}

function detectPlatform(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '')
    if (host === 'github.com') return 'github'
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') return 'youtube'
    if (host === 'open.spotify.com' || host.endsWith('.spotify.com')) return 'spotify'
    if (host === 'vimeo.com' || host === 'player.vimeo.com') return 'vimeo'
    if (host === 'behance.net') return 'behance'
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'linkedin'
    return 'generic'
  } catch {
    return 'generic'
  }
}

function faviconFor(rawUrl) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '')
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`
  } catch {
    return null
  }
}

// Only remote, fetchable images are valid preview art. data:/blob: URIs
// (e.g. Microlink's "no image" placeholder) are rejected.
const isRemoteUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u)

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
}

function getMeta(html, names) {
  for (const name of names) {
    const patterns = [
      `<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["']`,
      `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["']`,
      `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`,
      `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`
    ]
    for (const p of patterns) {
      const m = html.match(new RegExp(p, 'i'))
      if (m) return decodeEntities(m[1]).trim()
    }
  }
  return null
}

// ---------- platform fetchers ----------

async function fetchGithub(url) {
  const path = new URL(url).pathname.split('/').filter(Boolean)
  const user = path[0]
  if (!user) throw new Error('github url without user')
  const headers = { Accept: 'application/vnd.github+json' }
  const [profile, repos] = await Promise.allSettled([
    getJson(`https://api.github.com/users/${user}`, headers),
    getJson(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=1`, headers)
  ])
  if (profile.status === 'rejected') throw profile.reason
  const p = profile.value
  const repo = repos.status === 'fulfilled' && Array.isArray(repos.value) ? repos.value[0] : null
  return {
    title: p.name || p.login || null,
    description: p.bio || repo?.description || null,
    image_url: p.avatar_url || null,
    favicon_url: p.avatar_url || null,
    raw_metadata: { profile: p, latest_repo: repo }
  }
}

async function fetchOembed(service, url) {
  const data = await getJson(`${service}?url=${encodeURIComponent(url)}`)
  return {
    title: data.title || null,
    description: data.author_name || null,
    image_url: data.thumbnail_url || null,
    favicon_url: faviconFor(url),
    raw_metadata: data
  }
}

async function fetchBehance(url) {
  // Microlink free tier, no account: https://api.microlink.io (25 req/day)
  const data = await getJson(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
  const d = data?.data || {}
  const pick = (v) => (v && typeof v === 'object' ? (v.value ?? v.url ?? null) : v ?? null)
  const img = d.image && typeof d.image === 'object' ? (d.image.url ?? d.image.value ?? null) : d.image ?? null
  const logo = pick(d.logo)
  return {
    title: pick(d.title),
    description: pick(d.description),
    // Microlink returns a data:-URI placeholder when there's no cover art;
    // only real remote images are usable.
    image_url: isRemoteUrl(img) ? img : null,
    favicon_url: isRemoteUrl(logo) ? logo : faviconFor(url),
    raw_metadata: { status: data.status, data: d }
  }
}

async function fetchLinkedin(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  const slug = parts[parts.length - 1]
  if (!slug) throw new Error('linkedin url without slug')
  const isCompany = parts[0] === 'company'
  const avatar = `https://unavatar.io/linkedin/${isCompany ? `company:${slug}` : slug}`
  // unavatar returns an image (or a default fallback), no key needed
  const res = await fetch(avatar, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' })
  return {
    title: decodeURIComponent(slug).replace(/-/g, ' '),
    description: null,
    image_url: res.ok ? avatar : null,
    favicon_url: faviconFor(url),
    raw_metadata: { slug, type: isCompany ? 'company' : 'user' }
  }
}

async function fetchGeneric(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow'
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = (await res.text()).slice(0, 200_000)

  let title = getMeta(html, ['og:title', 'twitter:title'])
  if (!title) title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null
  const description = getMeta(html, ['og:description', 'twitter:description', 'description'])
  let image = getMeta(html, ['og:image', 'twitter:image'])
  if (image) {
    try { image = new URL(image, res.url).href } catch { /* keep as-is */ }
  }
  return {
    title: title || null,
    description: description || null,
    image_url: image || null,
    favicon_url: faviconFor(res.url),
    raw_metadata: { final_url: res.url }
  }
}

const FETCHERS = {
  github: fetchGithub,
  youtube: (u) => fetchOembed('https://www.youtube.com/oembed?format=json', u),
  spotify: (u) => fetchOembed('https://open.spotify.com/oembed', u),
  vimeo: (u) => fetchOembed('https://vimeo.com/api/oembed.json', u),
  behance: fetchBehance,
  linkedin: fetchLinkedin,
  generic: fetchGeneric
}

export async function refreshWidget(w) {
  const url = (w.content || '').trim()
  if (!/^https?:\/\//i.test(url)) return null
  const platform = detectPlatform(url)
  const data = await FETCHERS[platform](url)
  if (!data.title && !data.description && !data.image_url) return null
  const now = new Date().toISOString()
  return {
    widget_id: w.id,
    url,
    platform,
    title: data.title || w.title || null,
    description: data.description || w.description || null,
    // data:/blob: placeholders are never saved as preview art.
    image_url: isRemoteUrl(data.image_url) ? data.image_url : null,
    favicon_url: isRemoteUrl(data.favicon_url) ? data.favicon_url : null,
    raw_metadata: data.raw_metadata || null,
    fetched_at: now,
    updated_at: now
  }
}

// Reads all social widgets and fetches fresh preview metadata. Shared by the
// Vercel cron handler and scripts/refresh-previews.mjs (local populate).
export async function collectPreviews(client) {
  const { data: widgets, error } = await client
    .from('widgets')
    .select('id, content, title, description')
    .eq('type', 'social')
    .not('content', 'is', null)
    .limit(1000)

  if (error) throw new Error(error.message)
  if (!widgets?.length) return { total: 0, rows: [], failures: [] }

  const results = await Promise.allSettled(widgets.map(refreshWidget))

  const rows = []
  const failures = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      rows.push(r.value)
    } else {
      failures.push({
        widget_id: widgets[i].id,
        url: widgets[i].content,
        error: r.status === 'rejected' ? String(r.reason?.message || r.reason) : 'no metadata found'
      })
    }
  })

  return { total: widgets.length, rows, failures }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const { total, rows, failures } = await collectPreviews(supabase)

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from('box_previews')
        .upsert(rows, { onConflict: 'widget_id' })
      if (upsertError) {
        return res.status(500).json({ error: upsertError.message, updated: 0, failed: failures.length })
      }
    }

    return res.status(200).json({
      total,
      updated: rows.length,
      failed: failures.length,
      failures
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
