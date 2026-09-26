'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WatchTVPage({ params }) {
  const { id, season, ep } = use(params)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  // Load metadata TMDB
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/tmdb?tmdb=${id}&media=tv`)
        if (!res.ok) throw new Error('Gagal fetch metadata')
        const d = await res.json()
        setMeta(d)
      } catch (e) {
        setErr(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Cari url stream dari API catalog
  const [streamUrl, setStreamUrl] = useState('')
  useEffect(() => {
    if (!meta) return
    const getStream = async () => {
      try {
        const r = await fetch(`/api/catalog/${id}/streams?episode_id=`)
        const data = await r.json()
        if (Array.isArray(data) && data.length) {
          setStreamUrl(data[0]?.stream_url || '')
        }
      } catch (e) {
        console.error(e)
      }
    }
    getStream()
  }, [meta, id])

  if (loading) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Memuat episode...</div>
  if (err) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-red-400">Error: {err}</div>
  if (!meta) return <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Tidak ditemukan.</div>

  // Cari url stream yang cocok untuk season & episode
  useEffect(() => {
    const findUrl = async () => {
      const r = await fetch(`/api/catalog/${id}/streams?episode_id=`)
      const data = await r.json()
      // Cari yang aktif dan prioritas utama
      const aktif = (Array.isArray(data) ? data : []).find(s => s.is_active)
      if (aktif) setStreamUrl(aktif.stream_url)
    }
    findUrl()
  }, [season, ep, id])

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-1">{meta.name || meta.title}</h1>
        <p className="text-slate-400 text-sm mb-4">Season {season} Episode {ep} • {meta.first_air_date?.slice(0, 4)}</p>

        {/* Video Player */}
        <div className="aspect-video rounded-xl overflow-hidden bg-[#000] border border-white/5">
          {streamUrl ? (
            <video src={streamUrl} controls className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <p className="text-lg mb-2">Tidak ada stream yang tersedia</p>
                <a href={`/admin/edit/${id}`} className="bg-indigo-600 px-4 py-2 rounded-lg text-sm">Kelola Stream</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
