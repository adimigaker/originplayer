import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

// TMDB memakai 'tv', database hanya menerima 'movie' | 'series'
function normalisasiType(t) {
  const v = String(t || '').toLowerCase()
  if (v === 'tv' || v === 'series' || v === 'show') return 'series'
  return 'movie'
}

export async function GET() {
  const { data, error } = await supabase
    .from('op_titles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { tmdb_id, title, slug, poster, backdrop, synopsis, year, rating, genres } = body

    if (!tmdb_id || !title) {
      return Response.json({ error: 'tmdb_id dan title wajib diisi.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('op_titles')
      .upsert({
        tmdb_id: Number(tmdb_id),
        type: normalisasiType(body.type),
        title,
        slug: slug || String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        poster: poster || null,
        backdrop: backdrop || null,
        synopsis: synopsis || null,
        year: year || null,
        rating: rating || null,
        genres: genres || null,
      }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
