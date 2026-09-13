import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

// Tulis (POST/PUT/DELETE) wajib pin_hash kalau playlist dikunci.
// Baca (GET) terbuka untuk siapa pegang kode — sesuai desain tanpa akun.
async function cekPin(code, pin_hash) {
  const { data: row } = await supabase
    .from('ps_playlists')
    .select('pin_hash')
    .eq('code', code)
    .single()

  if (!row) return { err: 'Playlist tidak ditemukan.' }
  if (row.pin_hash && row.pin_hash !== pin_hash) {
    return { err: 'PIN salah.' }
  }
  return {}
}

// GET /api/playlists/items?code=X -> daftar isi library
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || ''

  const { data, error } = await supabase
    .from('ps_playlist_items')
    .select('*')
    .eq('playlist_code', code)
    .order('updated_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data || [])
}

// POST /api/playlists/items { playlist_code, pin_hash?, type, title, ... }
export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const code = String(body.playlist_code || '')

  const cek = await cekPin(code, body.pin_hash)
  if (cek.err) {
    return Response.json({ error: cek.err }, { status: cek.err === 'PIN salah.' ? 403 : 404 })
  }

  if (!['movie', 'series'].includes(body.type) || !String(body.title || '').trim()) {
    return Response.json({ error: 'type (movie/series) dan title wajib.' }, { status: 400 })
  }

  const row = {
    playlist_code: code,
    type: body.type,
    title: String(body.title).trim(),
    slug: null,
    year: body.year ? parseInt(body.year) || null : null,
    poster: body.poster || null,
    backdrop: body.backdrop || null,
    synopsis: body.synopsis || null,
    genre: body.genre || null,
    rating: body.rating ? parseFloat(body.rating) || null : null,
    cast: body.cast || null,
    director: body.director || null,
    duration: body.duration || null,
    tmdb_id: body.tmdb_id ? parseInt(body.tmdb_id) || null : null,
    imdb_id: body.imdb_id || null,
    embeds: Array.isArray(body.embeds) ? body.embeds : [],
    downloads: Array.isArray(body.downloads) ? body.downloads : [],
    mirrors: Array.isArray(body.mirrors) ? body.mirrors : [],
    subtitles: Array.isArray(body.subtitles) ? body.subtitles : [],
  }

  const dasar = String(body.slug || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'tanpa-judul'

  let data = null
  let error = null
  for (let i = 0; i < 3; i++) {
    row.slug = i === 0 ? dasar : `${dasar}-${Date.now().toString(36)}${i}`
    const res = await supabase.from('ps_playlist_items').insert(row).select().single()
    data = res.data
    error = res.error
    if (!error || error.code !== '23505') break
  }

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data, { status: 201 })
}

// PUT /api/playlists/items { id, playlist_code, pin_hash?, ...fields }
export async function PUT(request) {
  const body = await request.json().catch(() => ({}))
  const code = String(body.playlist_code || '')

  const cek = await cekPin(code, body.pin_hash)
  if (cek.err) {
    return Response.json({ error: cek.err }, { status: cek.err === 'PIN salah.' ? 403 : 404 })
  }

  if (!body.id) {
    return Response.json({ error: 'id wajib.' }, { status: 400 })
  }

  const boleh = [
    'type', 'title', 'slug', 'year', 'poster', 'backdrop', 'synopsis', 'genre',
    'rating', 'cast', 'director', 'duration', 'tmdb_id', 'imdb_id',
    'embeds', 'downloads', 'mirrors', 'subtitles',
  ]
  const patch = { updated_at: new Date().toISOString() }
  for (const k of boleh) {
    if (body[k] !== undefined) patch[k] = body[k]
  }

  const { data, error } = await supabase
    .from('ps_playlist_items')
    .update(patch)
    .eq('id', body.id)
    .eq('playlist_code', code)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

// DELETE /api/playlists/items?id=X&code=Y&pin=HASH
export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const code = searchParams.get('code') || ''
  const pin_hash = searchParams.get('pin') || ''

  const cek = await cekPin(code, pin_hash)
  if (cek.err) {
    return Response.json({ error: cek.err }, { status: cek.err === 'PIN salah.' ? 403 : 404 })
  }

  const { error } = await supabase
    .from('ps_playlist_items')
    .delete()
    .eq('id', id)
    .eq('playlist_code', code)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
