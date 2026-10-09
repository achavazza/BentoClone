// One-off local populate of box_previews from current social widgets.
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_..."
//   node scripts/refresh-previews.mjs
// SUPABASE_URL is read automatically from .env.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Minimal .env loader (merge into process.env, never override real env vars).
const envPath = path.join(root, '.env')
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
        if (m && !(m[1] in process.env)) {
            process.env[m[1]] = m[2].replace(/^["']/, '').replace(/["']$/, '')
        }
    }
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
    console.error('Falta SUPABASE_SERVICE_ROLE_KEY. Definí la var temporal antes de correr el script.')
    process.exit(1)
}

const { collectPreviews } = await import('../api/refresh-metadata.js')
const supabase = createClient(url, key)

const { total, rows, failures } = await collectPreviews(supabase)

if (rows.length) {
    const { error } = await supabase
        .from('box_previews')
        .upsert(rows, { onConflict: 'widget_id' })
    if (error) {
        console.error('Upsert falló (¿ya corriste supabase_box_previews.sql?):', error.message)
        process.exit(1)
    }
}

console.log(`Previews: total ${total} | actualizados ${rows.length} | fallaron ${failures.length}`)
for (const f of failures) {
    console.log(`  FAIL widget ${f.widget_id} (${f.url}): ${f.error}`)
}