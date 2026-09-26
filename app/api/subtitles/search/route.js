export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tmdb_id = searchParams.get('tmdb_id')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  const languages = searchParams.get('languages') || 'id,en'
  const query = searchParams.get('query')

  const apiKey = process.env.OPENSUBTITLES_API_KEY || ''

  try {
    const params = new URLSearchParams()
    if (tmdb_id) params.append('tmdb_id', tmdb_id)
    if (season) params.append('season_number', season)
    if (episode) params.append('episode_number', episode)
    if (languages) params.append('languages', languages)
    if (query) params.append('query', query)

    const headers = {
      'User-Agent': 'OriginPlayer v1.0.0',
    }
    if (apiKey) {
      headers['Api-Key'] = apiKey
    }

    const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params.toString()}`, {
      headers,
    })

    if (!res.ok) {
      return Response.json({ error: 'Gagal mengambil subtitle dari OpenSubtitles' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
