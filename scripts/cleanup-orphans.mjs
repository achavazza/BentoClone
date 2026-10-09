// Cleanup of orphaned storage objects.
//
// An object is an orphan if no profile.avatar_url, widget.content or
// widget.icon references it.
//
// Usage (from the repo root):
//   node scripts/cleanup-orphans.mjs            -> dry-run (nothing deleted)
//   node scripts/cleanup-orphans.mjs --delete   -> actually delete
//
// Requires the SERVICE ROLE key (needs delete permission):
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment,
//   or SUPABASE_SERVICE_ROLE_KEY in .env (URL falls back to VITE_SUPABASE_URL).
import { readFileSync } from 'node:fs'

function loadEnv(file = '.env') {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // no .env file, rely on the real environment
  }
}

loadEnv()

const URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const DELETE = process.argv.includes('--delete')
const BUCKETS = ['user-content', 'avatars']

if (!URL) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL). Aborting.')
  process.exit(1)
}
if (DELETE && !SERVICE_KEY) {
  console.error('--delete requires SUPABASE_SERVICE_ROLE_KEY. Aborting.')
  process.exit(1)
}
const KEY = SERVICE_KEY || ANON_KEY
if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY. Aborting.')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function listAll(bucket) {
  const files = []
  async function walk(prefix) {
    const res = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })
    })
    if (!res.ok) throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status}`)
    const items = await res.json()
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name
      if (it.id) files.push(path)
      else await walk(path)
    }
  }
  await walk('')
  return files
}

function refFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const m = url.match(/\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!m) return null
  return `${m[1]}/${decodeURIComponent(m[2])}`
}

async function getJson(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers })
  if (!res.ok) throw new Error(`REST ${path}: HTTP ${res.status}`)
  return res.json()
}

async function main() {
  const [profiles, widgets] = await Promise.all([
    getJson('profiles?select=username,avatar_url'),
    getJson('widgets?select=id,content,icon')
  ])

  const referenced = new Map() // "bucket/path" -> who references it
  for (const p of profiles) {
    const r = refFromUrl(p.avatar_url)
    if (r) referenced.set(r, `profile:${p.username}`)
  }
  for (const w of widgets) {
    for (const u of [w.content, w.icon]) {
      const r = refFromUrl(u)
      if (r) referenced.set(r, `widget:${w.id}`)
    }
  }

  const all = []
  for (const bucket of BUCKETS) {
    for (const path of await listAll(bucket)) all.push({ bucket, path, key: `${bucket}/${path}` })
  }

  const orphans = all.filter((f) => !referenced.has(f.key))
  const kept = all.filter((f) => referenced.has(f.key))

  console.log(`\nStorage objects found: ${all.length}`)
  console.log(`  referenced (keep): ${kept.length}`)
  console.log(`  orphan (delete)  : ${orphans.length}\n`)

  console.log('KEEP:')
  for (const f of kept) console.log(`  + ${f.key}  <- ${referenced.get(f.key)}`)

  if (!orphans.length) {
    console.log('\nNo orphans. Nothing to do.')
    return
  }

  console.log('\nORPHANS:')
  for (const f of orphans) console.log(`  - ${f.key}`)

  if (!DELETE) {
    console.log('\nDRY-RUN. Re-run with --delete to remove the objects above.')
    return
  }

  for (const bucket of BUCKETS) {
    const prefixes = orphans.filter((o) => o.bucket === bucket).map((o) => o.path)
    if (!prefixes.length) continue
    const res = await fetch(`${URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes })
    })
    console.log(`Deleted ${prefixes.length} from ${bucket}: HTTP ${res.status}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
