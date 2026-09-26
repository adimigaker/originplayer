'use client'

import { useState, useEffect } from 'react'
import VideoPlayer from '@/components/playlists/VideoPlayer'

export default function WatchTVPage({ params }) {
  const { id, season, ep } = params
  const [data, setData] = useState(null)

  useEffect(() => {
    // Kita harus fetch:
    // 1. Metadata series dari TMDB (via /api/tmdb?tmdb=${id}&media=tv)
    // 2. Stream url dari database (via API kita sendiri nanti untuk detail)
    async function load() {
      const res = await fetch(`/api/tmdb?tmdb=${id}&media=tv`)
      const meta = await res.json()
      setData({ meta })
    }
    load()
  }, [id])

  if (!data) return <div className="text-white">Memuat...</div>

  return (
    <div className="bg-slate-950 p-6 text-white max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{data.meta.title} - S{season} E{ep}</h1>
      <VideoPlayer 
        title={`${data.meta.title} S${season} E${ep}`}
        embedUrl="https://abyssplayer.com/..." // placeholder
        tunnel="https://piratestudio21.vercel.app"
      />
    </div>
  )
}
