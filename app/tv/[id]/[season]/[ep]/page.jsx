'use client'

import { use, useState, useEffect } from 'react'

export default function WatchTVPage({ params }) {
  const { id, season, ep } = use(params)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
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

  if (loading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Memuat pemutar...</div>
  if (!data) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Gagal memuat data.</div>

  const primary = data.streams[0]

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-1">{data.meta.name || 'Series'}</h1>
        <p className="text-slate-400 text-sm mb-4">Season {season} Episode {ep}</p>

        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl relative">
          {primary ? (
            primary.stream_url.includes('abyssplayer.com') || primary.stream_url.includes('embed') ? (
              <iframe src={primary.stream_url} className="w-full h-full border-0" allowFullScreen />
            ) : (
              <video src={primary.stream_url} controls className="w-full h-full" autoPlay />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="mb-2">Tidak ada stream tersedia untuk episode ini</p>
              <a href={`/admin/edit/${id}`} className="bg-indigo-600 px-4 py-2 rounded-lg text-white text-xs">Kelola di Admin</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
