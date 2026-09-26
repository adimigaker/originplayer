export const dynamic = 'force-dynamic'

export async function POST(request) {
  const apiKey = process.env.OPENSUBTITLES_API_KEY || ''
  try {
    const body = await request.json()
    const { file_id } = body

    if (!file_id) {
      return Response.json({ error: 'file_id diperlukan' }, { status: 400 })
    }

    const res = await fetch('https://api.opensubtitles.com/api/v1/download', {
      method: 'POST',
      headers: {
        'User-Agent': 'OriginPlayer v1.0.0',
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({ file_id }),
    })

    if (!res.ok) {
      return Response.json({ error: 'Gagal mendapatkan link download subtitle' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
