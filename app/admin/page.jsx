'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedType, setSelectedType] = useState('series')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const router = useRouter()

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
    setSearching(true)
    try {
      const mediaType = selectedType === 'movie' ? 'movie' : 'tv'
      const res = await fetch(`/api/tmdb?search=${encodeURIComponent(searchQuery)}&media=${mediaType}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  async function addTitle(tmdbData) {
    setSaving(true)
    setSaveErr('')
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: tmdbData.tmdb_id,
          type: tmdbData.media || selectedType,
          title: tmdbData.title,
          slug: tmdbData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          poster: tmdbData.poster,
          backdrop: tmdbData.backdrop,
          synopsis: tmdbData.synopsis,
          year: tmdbData.year,
          rating: tmdbData.rating,
        })
      })
      const d = await res.json()
      // PENTING: hanya redirect kalau API benar-benar sukses
      if (!res.ok) throw new Error(d.error || `Server menolak (${res.status})`)
      setShowModal(false)
      fetchCatalog()
      router.push(`/admin/edit/${tmdbData.tmdb_id}`)
    } catch (e) {
      setSaveErr('Gagal menambah konten: ' + e.message)
      alert('Gagal menambah konten: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteTitle(id) {
    if (!confirm('Hapus konten ini dari katalog secara permanen?')) return
    try {
      await fetch(`/api/catalog/${id}`, { method: 'DELETE' })
      fetchCatalog()
    } catch (e) {
      alert('Gagal menghapus: ' + e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-100 font-sans">
      {/* Sidebar / Topbar Admin */}
      <nav className="border-b border-white/5 bg-[#0b0f1a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">O</div>
              <h1 className="text-xl font-bold tracking-tight">Origin<span className="text-indigo-400">Admin</span></h1>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-white transition">Lihat Situs</button>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                <span className="material-icons text-[18px]">add</span> Tambah Konten
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold">Katalog Media</h2>
            <p className="text-slate-400 text-sm mt-1">Total {items.length} konten tersimpan di database.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
             <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p>Memuat katalog...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
             <span className="material-icons text-5xl text-slate-600 mb-4">movie_filter</span>
             <h3 className="text-lg font-semibold">Katalog masih kosong</h3>
             <p className="text-slate-400 text-sm mt-2 mb-6">Mulai isi koleksi media kamu dari TMDB.</p>
             <button onClick={() => setShowModal(true)} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-lg text-sm font-medium transition">Cari TMDB Sekarang</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {items.map((item) => (
              <div key={item.id} className="group relative bg-[#161b2c] rounded-xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
                <div className="aspect-[2/3] relative overflow-hidden bg-slate-800">
                  <img 
                    src={item.poster || '/placeholder.png'} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                     <span className="bg-black/60 backdrop-blur-md text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-indigo-300 border border-white/5">{item.type}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                     <button 
                        onClick={() => deleteTitle(item.id)}
                        className="bg-red-500/20 hover:bg-red-500 backdrop-blur-md text-red-400 hover:text-white p-2 rounded-lg transition-all border border-red-500/30 mb-2 flex items-center justify-center gap-2 text-xs font-bold"
                     >
                        <span className="material-icons text-sm">delete</span> Hapus
                     </button>
                     <a 
                        href={`/admin/edit/${item.tmdb_id}`}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all text-center text-xs font-bold shadow-lg shadow-indigo-500/20"
                     >
                        Kelola Stream
                     </a>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate group-hover:text-indigo-400 transition">{item.title}</h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">{item.year} • ★ {item.rating}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Modern */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0b0f1a]/90 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#161b2c] border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1c2237]">
              <div>
                <h2 className="text-xl font-bold">Cari di TMDB</h2>
                <p className="text-xs text-slate-400 mt-0.5">Cari series atau film untuk diimpor ke katalog.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
                <span className="material-icons text-lg">close</span>
              </button>
            </div>

            {/* Jenis Konten Selector */}
            <div className="px-6 pt-4 flex gap-3">
              <button
                onClick={() => setSelectedType('series')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${selectedType === 'series' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                TV Series
              </button>
              <button
                onClick={() => setSelectedType('movie')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${selectedType === 'movie' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Movie
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <div className="relative flex-1">
                   <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                   <input 
                      type="text" 
                      placeholder="Masukkan judul..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-3 text-white transition outline-none"
                      autoFocus
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={searching}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 rounded-xl font-bold transition shrink-0"
                >
                  {searching ? '...' : 'Cari'}
                </button>
              </form>

              <div className="space-y-3">
                {searchResults.length > 0 ? searchResults.map((res) => (
                  <div key={res.tmdb_id} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="w-16 h-24 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-white/5 shadow-lg">
                      <img src={res.poster || '/placeholder.png'} alt={res.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-sm truncate pr-2">{res.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{res.media || selectedType}</span>
                        <span className="text-slate-500 text-[10px]">•</span>
                        <span className="text-slate-400 text-[10px] font-medium">{res.year}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-2 font-medium">{res.synopsis || 'Tidak ada deskripsi.'}</p>
                    </div>
                    <div className="flex items-center">
                      <button 
                        onClick={() => addTitle(res)}
                        className="bg-white/10 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                )) : searchQuery && !searching && (
                  <p className="text-center text-slate-500 py-10 text-sm">Tidak ada hasil ditemukan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
