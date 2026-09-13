export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabaseClient'

// POST /api/playlists/verify { code, pin_hash } -> { ok }
// Hash tidak pernah dikirim ke browser; cocok/tidaknya diputus di server.
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const code = String(body.code || '')
  const pin_hash = String(body.pin_hash || '')

  const { data: row } = await supabase
    .from('ps_playlists')
    .select('pin_hash')
    .eq('code', code)
    .single()

  if (!row) {
    return Response.json({ error: 'Playlist tidak ditemukan.' }, { status: 404 })
  }

  if (!row.pin_hash) {
    return Response.json({ ok: true })
  }

  return Response.json({ ok: row.pin_hash === pin_hash })
}
