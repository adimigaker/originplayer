'use client'

import { use, useState, useEffect } from 'react'

export default function WatchMoviePage({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const resMeta = await fetch(`/api/tmdb?tmdb=${id}&media=movie`)
        const meta = await resMeta.json()

        const resStream = await fetch(`/api/catalog/${id}/watch?type=movie`)
        const streamData = await resStream.json()

        setData({ meta, streams: streamData.streams || [] })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  if (loading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Memuat...</div>
  if (!data) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Error/Data tidak ada.</div>

  const primary = data.streams[0]

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-1">{data.meta.title || 'Movie'}</h1>

        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/5">
          {primary ? (
            <video src={primary.stream_url} controls className="w-full h-full" autoPlay />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p>Tidak ada stream tersedia</p>
              <a href={`/admin/edit/${id}`} className="mt-2 text-indigo-400 underline">Kelola</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
