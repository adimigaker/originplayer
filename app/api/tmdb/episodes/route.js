export const dynamic = 'force-dynamic'

// GET /api/tmdb/episodes?tmdb=194766&season=3 -> daftar episode season tsb
export async function GET(request) {
  const KEY = process.env.TMDB_API_KEY
  if (!KEY) return Response.json({ error: 'TMDB_API_KEY belum dipasang.' }, { status: 501 })

  const { searchParams } = new URL(request.url)
  const tmdb = searchParams.get('tmdb')
  const season = searchParams.get('season')
  if (!tmdb) return Response.json({ error: 'Parameter tmdb wajib diisi.' }, { status: 400 })

  try {
    const seasonsRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdb}?language=id-ID`, {
      headers: { Authorization: 'Bearer ' + KEY },
    })
    if (!seasonsRes.ok) throw new Error('TMDB ' + seasonsRes.status)
    const meta = await seasonsRes.json()

    const seasons = (meta.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({ season: s.season_number, jumlah: s.episode_count, nama: s.name, tahun: s.air_date ? s.air_date.slice(0, 4) : null }))

    if (season === null || season === '') return Response.json({ seasons, judul: meta.name, status: meta.status })

    const detRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdb}/season/${season}?language=id-ID`, {
      headers: { Authorization: 'Bearer ' + KEY },
    })
    if (!detRes.ok) throw new Error('TMDB season ' + detRes.status)
    const det = await detRes.json()

    const episodes = (det.episodes || []).map((e) => ({
      episode: e.episode_number,
      nama: e.name,
      overview: e.overview,
      runtime: e.runtime,
      tanggal: e.air_date,
      still: e.still_path ? 'https://image.tmdb.org/t/p/w300' + e.still_path : null,
    }))

    return Response.json({ season: det.season_number, episodes })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 })
  }
}
