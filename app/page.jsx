'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              OriginPlayer
            </h1>
            <p className="text-slate-400 text-xs mt-1">Katalog Media & Player Mandiri</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Memuat koleksi film & series...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800/50 p-8">
            <h2 className="text-lg font-bold mb-2">Belum ada koleksi tersimpan</h2>
            <p className="text-slate-400 text-sm mb-4">Tambahkan film atau series pertama melalui Admin Panel.</p>
            <Link href="/admin" className="bg-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold">
              Buka Admin
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
              <Link 
                key={item.id} 
                href={item.type === 'series' ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`}
                className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-800/80 hover:border-indigo-500/50 transition duration-200"
              >
                <div className="aspect-[2/3] w-full bg-slate-800 relative overflow-hidden">
                  <img 
                    src={item.poster || '/placeholder.png'} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {item.rating && (
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-white/10">
                      ★ {item.rating}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate group-hover:text-indigo-400 transition">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 uppercase">{item.type} {item.year ? `• ${item.year}` : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
