'use client'

import { useState, useEffect } from 'react'

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    fetchCatalog()
  }, [])

  async function fetchCatalog() {
    setLoading(true)
    try {
      const res = await fetch('/api/catalog')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery) return
    const res = await fetch(`/api/tmdb?search=${encodeURIComponent(searchQuery)}&media=tv`)
    const data = await res.json()
    setSearchResults(Array.isArray(data) ? data : [])
  }

  async function addTitle(tmdbData) {
    await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: tmdbData.tmdb_id,
        type: tmdbData.media,
        title: tmdbData.title,
        slug: tmdbData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        poster: tmdbData.poster,
        backdrop: tmdbData.backdrop,
        synopsis: tmdbData.synopsis,
        year: tmdbData.year,
        rating: tmdbData.rating,
      })
    })
    setShowModal(false)
    fetchCatalog()
  }

  async function deleteTitle(id) {
    if (!confirm('Hapus konten ini dari katalog?')) return
    await fetch(`/api/catalog/${id}`, { method: 'DELETE' })
    fetchCatalog()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">OriginPlayer Catalog Admin</h1>
          <p className="text-slate-400 text-sm">Kelola daftar Series & Movie untuk katalog utama.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-500"
        >
          + Tambah Konten
        </button>
      </div>

      {loading ? (
        <p>Memuat katalog...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <img src={item.poster || '/placeholder.png'} alt={item.title} className="aspect-[2/3] w-full object-cover" />
              <div className="p-3">
                <h3 className="font-bold truncate text-sm">{item.title}</h3>
                <p className="text-xs text-slate-400 uppercase">{item.type} • {item.year}</p>
                <div className="flex justify-between mt-3 text-xs">
                  <button onClick={() => deleteTitle(item.id)} className="text-red-400">Hapus</button>
                  <a href={`/tv/${item.tmdb_id}`} target="_blank" className="text-indigo-400 font-semibold">Lihat</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Import TMDB */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Cari / Tambah dari TMDB</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Judul Movie / Series..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
              <button type="submit" className="bg-indigo-600 px-4 py-2 rounded-lg font-semibold shrink-0">Cari</button>
            </form>

            <div className="space-y-2">
              {searchResults.map((res) => (
                <div key={res.tmdb_id} className="flex gap-3 bg-slate-800/50 p-2 rounded-lg items-center">
                  <img src={res.poster} alt={res.title} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{res.title}</h4>
                    <p className="text-xs text-slate-400">{res.year}</p>
                  </div>
                  <button 
                    onClick={() => addTitle(res)}
                    className="bg-emerald-600 px-3 py-1 rounded text-xs font-semibold"
                  >
                    Tambah
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
