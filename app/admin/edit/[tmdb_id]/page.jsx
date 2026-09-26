'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditPage() {
  const { tmdb_id } = useParams()
  const router = useRouter()
  const [title, setTitle] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEp, setNewEp] = useState({ season: 1, ep: 1, url: '' })

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/catalog/tmdb/${tmdb_id}`)
      const data = await res.json()
      if (data.id) {
        setTitle(data)
        fetchEpisodes(data.id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [tmdb_id])

  async function fetchEpisodes(id) {
    const res = await fetch(`/api/catalog/${id}/episodes`)
    const data = await res.json()
    setEpisodes(data)
    setLoading(false)
  }

  async function addEpisode(e) {
    e.preventDefault()
    await fetch(`/api/catalog/${title.id}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season_number: newEp.season,
        episode_number: newEp.ep,
        stream_url: newEp.url
      })
    })
    fetchEpisodes(title.id)
  }

  if (loading) return <div className="p-8 text-white">Memuat...</div>
  if (!title) return <div className="p-8 text-white">Judul tidak ditemukan.</div>

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">{title.title}</h1>
      
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8">
        <h2 className="text-lg font-bold mb-4">Tambah Episode / Stream</h2>
        <form onSubmit={addEpisode} className="flex gap-4">
          <input type="number" placeholder="Season" className="bg-slate-800 p-2 rounded" value={newEp.season} onChange={e => setNewEp({...newEp, season: e.target.value})} />
          <input type="number" placeholder="Episode" className="bg-slate-800 p-2 rounded" value={newEp.ep} onChange={e => setNewEp({...newEp, ep: e.target.value})} />
          <input type="text" placeholder="URL Stream (Abyss/Embed)" className="bg-slate-800 p-2 rounded flex-1" value={newEp.url} onChange={e => setNewEp({...newEp, url: e.target.value})} />
          <button className="bg-indigo-600 px-6 py-2 rounded">Simpan</button>
        </form>
      </div>

      <div className="grid gap-4">
        {episodes.map(e => (
          <div key={e.id} className="bg-slate-900 p-4 rounded border border-slate-800 flex justify-between">
            <span>S{e.season_number} E{e.episode_number}</span>
            <span className="text-slate-400 text-sm">{(e.op_streams || []).map(s => s.stream_url).join(', ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
