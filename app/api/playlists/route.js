import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/

// GET /api/playlists?code=X -> { code, has_pin } (tanpa hash)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || ''

  if (!CODE_RE.test(code)) {
    return Response.json({ error: 'Kode tidak valid.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ps_playlists')
    .select('code, pin_hash')
    .eq('code', code)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Playlist tidak ditemukan.' }, { status: 404 })
  }

  return Response.json({ code: data.code, has_pin: !!data.pin_hash })
}

// POST /api/playlists { code, pin_hash? } -> buat baru (409 kalau dipakai)
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const code = String(body.code || '')

  if (!CODE_RE.test(code)) {
    return Response.json(
      { error: 'Kode hanya boleh huruf, angka, - dan _ (tanpa spasi).' },
      { status: 400 }
    )
  }

  const pin_hash =
    typeof body.pin_hash === 'string' && /^[a-f0-9]{64}$/.test(body.pin_hash)
      ? body.pin_hash
      : null

  const { data: ada } = await supabase
    .from('ps_playlists')
    .select('code')
    .eq('code', code)
    .single()

  if (ada) {
    return Response.json({ error: 'Kode sudah dipakai, pilih yang lain.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('ps_playlists')
    .insert({ code, pin_hash })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ code, has_pin: !!pin_hash }, { status: 201 })
}

// PUT /api/playlists { code, pin_hash|null, pin_current? } -> atur/hapus PIN
export async function PUT(request) {
  const body = await request.json().catch(() => ({}))
  const code = String(body.code || '')

  if (!CODE_RE.test(code)) {
    return Response.json({ error: 'Kode tidak valid.' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('ps_playlists')
    .select('pin_hash')
    .eq('code', code)
    .single()

  if (!row) {
    return Response.json({ error: 'Playlist tidak ditemukan.' }, { status: 404 })
  }

  // Kalau sudah dikunci, wajib PIN lama yang cocok
  if (row.pin_hash && body.pin_current !== row.pin_hash) {
    return Response.json({ error: 'PIN lama salah.' }, { status: 403 })
  }

  const pin_hash =
    body.pin_hash === null
      ? null
      : typeof body.pin_hash === 'string' && /^[a-f0-9]{64}$/.test(body.pin_hash)
        ? body.pin_hash
        : undefined

  if (pin_hash === undefined) {
    return Response.json({ error: 'Format PIN tidak valid.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ps_playlists')
    .update({ pin_hash })
    .eq('code', code)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ code, has_pin: !!pin_hash })
}
