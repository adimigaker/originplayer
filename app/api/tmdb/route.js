export const dynamic = 'force-dynamic'

// Proxy TMDB agar API key tidak bocor ke browser (Vercel-safe, JSON ringan).
// GET /api/tmdb?imdb=tt0111161  -> cari via IMDb ID (movie dulu, lalu tv)
// GET /api/tmdb?tmdb=278&media=movie
// GET /api/tmdb?search=naruto&media=tv
const IMG = 'https://image.tmdb.org/t/p/'

function ringkas(media, d) {
  const judul = d.title || d.name || ''
  const tgl = d.release_date || d.first_air_date || ''
  return {
    tmdb_id: d.id,
    media,
    title: judul,
    year: tgl ? parseInt(tgl.slice(0, 4)) || null : null,
    poster: d.poster_path ? IMG + 'w500' + d.poster_path : null,
    backdrop: d.backdrop_path ? IMG + 'original' + d.backdrop_path : null,
    synopsis: d.overview || null,
    rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    imdb_id: null,
  }
}

export async function GET(request) {
  const KEY = process.env.TMDB_API_KEY

  if (!KEY) {
    return Response.json(
      { error: 'TMDB_API_KEY belum dipasang di env.' },
      { status: 501 }
    )
  }

  const { searchParams } = new URL(request.url)
  const imdb = searchParams.get('imdb')
  const tmdb = searchParams.get('tmdb')
  const media = searchParams.get('media') === 'tv' ? 'tv' : 'movie'
  const q = searchParams.get('search')

  const get = async (path) => {
    const r = await fetch(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: 'Bearer ' + KEY },
    })
    if (!r.ok) throw new Error('TMDB ' + r.status)
    return r.json()
  }

  try {
    // 1. Dari URL IMDb (tt...) — TMDB find
    if (imdb) {
      const m = String(imdb).match(/tt\d+/)
      if (!m) return Response.json({ error: 'ID IMDb tidak ketemu.' }, { status: 400 })
      const found = await get(`/find/${m[0]}?external_source=imdb_id&language=id-ID`)
      const hit = (found.movie_results || [])[0] || (found.tv_results || [])[0]
      if (!hit) return Response.json({ error: 'Tidak ketemu di TMDB.' }, { status: 404 })
      const isTv = !(found.movie_results || [])[0] && !!(found.tv_results || [])[0]
      const det = await get(`/${isTv ? 'tv' : 'movie'}/${hit.id}?language=id-ID&append_to_response=credits,external_ids`)
      const out = ringkas(isTv ? 'tv' : 'movie', det)
      out.imdb_id = m[0]
      out.genre = (det.genres || []).map((g) => g.name).join(', ') || null
      out.cast = ((det.credits || {}).cast || []).slice(0, 8).map((c) => c.name).join(', ') || null
      out.director = ((det.credits || {}).crew || []).find((c) => c.job === 'Director')?.name || null
      return Response.json(out)
    }

    // 2. Dari ID TMDB langsung
    if (tmdb) {
      const det = await get(`/${media}/${tmdb}?language=id-ID&append_to_response=credits,external_ids`)
      const out = ringkas(media, det)
      out.imdb_id = (det.external_ids || {}).imdb_id || null
      out.genre = (det.genres || []).map((g) => g.name).join(', ') || null
      out.cast = ((det.credits || {}).cast || []).slice(0, 8).map((c) => c.name).join(', ') || null
      out.director = ((det.credits || {}).crew || []).find((c) => c.job === 'Director')?.name || null
      return Response.json(out)
    }

    // 3. Cari judul (buat yang cuma ingat nama)
    if (q) {
      const res = await get(`/search/${media}?query=${encodeURIComponent(q)}&language=id-ID&page=1`)
      return Response.json(
        (res.results || []).slice(0, 8).map((d) => ringkas(media, d))
      )
    }

    return Response.json({ error: 'Kasih imdb= / tmdb= / search=.' }, { status: 400 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 })
  }
}
