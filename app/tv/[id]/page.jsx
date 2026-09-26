'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'

export default function SeriesPage({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        // Ambil info detail series dari TMDB
        const res = await fetch(`/api/tmdb?tmdb=${id}&media=tv`)
        const meta = await res.json()
        
        // Ambil daftar episode yang sudah ada stream-nya dari Supabase
        const resCat = await fetch(`/api/catalog/${id}/episodes`)
        const episodes = await resCat.json()

        setData({ meta, episodes: episodes || [] })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  if (loading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Memuat...</div>
  if (!data) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Error.</div>

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white p-6">
      <h1 className="text-2xl font-bold mb-6">{data.meta.name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.episodes.map((ep) => (
          <Link key={ep.id} href={`/tv/${id}/${ep.season_number}/${ep.episode_number}`} className="bg-white/5 p-4 rounded-xl hover:bg-white/10">
            <p className="font-bold">S{ep.season_number} E{ep.episode_number}</p>
            <p className="text-sm text-slate-400 truncate">{ep.episode_title}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
