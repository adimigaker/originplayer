'use client'

import { use, useState, useEffect } from 'react'
import VideoPlayer from '@/components/playlists/VideoPlayer'
import { tunnelBase, proxyBases } from '@/lib/playlist'

export default function WatchTVEmbedPage({ params }) {
  const { id, season, ep } = use(params)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tunnel, setTunnel] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setTunnel(await proxyBases())
        
        const resMeta = await fetch(`/api/tmdb?tmdb=${id}&media=tv`)
        const meta = await resMeta.json()

        const resStream = await fetch(`/api/catalog/${id}/watch?s=${season}&e=${ep}&type=series`)
        const streamData = await resStream.json()

        setData({ meta, streams: streamData.streams || [] })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, season, ep])

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-slate-500 text-sm">
        Memuat...
      </div>
    )
  }

  if (!data || !data.streams.length) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
        <p>Stream tidak tersedia untuk S{season}E{ep}</p>
        <a href={`/admin/edit/${id}`} target="_blank" className="text-indigo-400 underline text-xs">Kelola Admin</a>
      </div>
    )
  }

  const primary = data.streams[0]
  const title = `${data.meta.name || 'Series'} - S${season}E${ep}`.replace(/^(.*) - S(\d+)E(\d+)$/, '**$1** - S$2E$3')

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      <div className="w-full h-full">
        <VideoPlayer 
          embedUrl={primary.stream_url} 
          title={title} 
          autoPutar={true} 
          tunnel={tunnel} 
        />
      </div>
    </div>
  )
}
