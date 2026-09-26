'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [type, setType] = useState('tv')
  const [tmdbId, setTmdbId] = useState('194766')
  const [season, setSeason] = useState('3')
  const [episode, setEpisode] = useState('1')
  const [abyssUrl, setAbyssUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://originplayer.vercel.app'
  const generatedUrl = type === 'tv' 
    ? `${originUrl}/tv/${tmdbId}/${season}/${episode}` 
    : `${originUrl}/movie/${tmdbId}`

  const iframeCode = `<iframe src="${generatedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2 text-indigo-400">OriginPlayer Admin & Embed Generator</h1>
        <p className="text-slate-400 text-sm mb-6">Kelola dan hasilkan URL / Iframe OriginPlayer untuk disematkan di Piratestudio21.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tipe Konten</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setType('tv')}
                className={`px-4 py-2 rounded-lg font-medium text-sm border ${type === 'tv' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                TV Series
              </button>
              <button
                type="button"
                onClick={() => setType('movie')}
                className={`px-4 py-2 rounded-lg font-medium text-sm border ${type === 'movie' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
              >
                Movie
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">TMDB ID</label>
            <input
              type="text"
              value={tmdbId}
              onChange={(e) => setTmdbId(e.target.value)}
              placeholder="Contoh: 194766"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {type === 'tv' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Season</label>
                <input
                  type="number"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Episode</label>
                <input
                  type="number"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">URL Abyss / Stream Direct (Opsional)</label>
            <input
              type="text"
              value={abyssUrl}
              onChange={(e) => setAbyssUrl(e.target.value)}
              placeholder="https://abyss.to/or/custom/stream..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Generated Embed URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-indigo-300 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(generatedUrl)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shrink-0"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Iframe HTML Code (Untuk Piratestudio21)</label>
            <div className="flex gap-2">
              <textarea
                readOnly
                rows={2}
                value={iframeCode}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(iframeCode)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shrink-0 self-start"
              >
                Copy Iframe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
