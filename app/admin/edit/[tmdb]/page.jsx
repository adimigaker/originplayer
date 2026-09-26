'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toast'

const inputCls = 'w-full bg-slate-800/60 border border-white/10 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition'
const btnCls = 'px-4 py-2 rounded-xl text-xs font-bold transition'

// Panah reorder SVG
function Arrows({ idx, total, onMove }) {
  const up = idx > 0
  const down = idx < total - 1
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onMove(idx, idx - 1)}
        disabled={!up}
        className={`material-icons text-base rounded ${up ? 'text-indigo-400 hover:bg-indigo-500/20 cursor-pointer' : 'text-slate-700 cursor-not-allowed'}`}
      >arrow_upward</button>
      <button
        type="button"
        onClick={() => onMove(idx, idx + 1)}
        disabled={!down}
        className={`material-icons text-base rounded ${down ? 'text-indigo-400 hover:bg-indigo-500/20 cursor-pointer' : 'text-slate-700 cursor-not-allowed'}`}
      >arrow_downward</button>
    </div>
  )
}

export default function EditTitle({ params }) {
  const resolvedParams = use(params)
  const { tmdb: tmdbId } = resolvedParams
  const router = useRouter()
  const [title, setTitle] = useState(null)
  const [meta, setMeta] = useState(null)
  const [notFoundCat, setNotFoundCat] = useState(false)
  const [loading, setLoading] = useState(true)

  // streams
  const [streams, setStreams] = useState([])
  // series
  const [seasons, setSeasons] = useState([])
  const [season, setSeason] = useState(1)
  const [eps, setEps] = useState([])
  const [fetchingEps, setFetchingEps] = useState(false)

  // form tambah stream
  const [fServer, setFServer] = useState('Abyss Utama')
  const [fUrl, setFUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')

  async function bootstrap() {
    setLoading(true)
    try {
      const r = await fetch('/api/catalog')
      const all = await r.json()
      const t = (Array.isArray(all) ? all : []).find((x) => String(x.tmdb_id) === String(tmdbId))
      if (!t) { setNotFoundCat(true) }
      else {
        setTitle(t)
        setTab(t.type === 'series' ? 'episode' : 'stream')
      }
      // metadata tambahan dari TMDB
      const media = t?.type === 'movie' ? 'movie' : 'tv'
      const m = await fetch(`/api/tmdb?tmdb=${tmdbId}&media=${media}`)
      if (m.ok) setMeta(await m.json())
      if (t) {
        if (t.type === 'series') await loadSeasons(t.id)
        else await loadStreams(t.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const [tab, setTab] = useState('stream')

  async function loadStreams(titleId) {
    const r = await fetch(`/api/catalog/${titleId}/streams`)
    const d = await r.json()
    setStreams(Array.isArray(d) ? d : [])
  }

  async function loadSeasons(titleId) {
    const r = await fetch(`/api/tmdb/episodes?tmdb=${tmdbId}`)
    const d = await r.json()
    if (d.seasons) {
      setSeasons(d.seasons)
      const first = d.seasons[0]?.season || 1
      setSeason(first)
      loadEpisodes(first, titleId)
    } else setErr(d.error || 'Gagal memuat daftar season.')
  }

  async function loadEpisodes(sn, titleId) {
    setFetchingEps(true)
    const r = await fetch(`/api/tmdb/episodes?tmdb=${tmdbId}&season=${sn}`)
    const d = await r.json()
    if (!d.episodes) { setEps([]); setErr(d.error || 'Gagal memuat episode.') }
    else {
      const r2 = await fetch(`/api/catalog/${titleId || title?.id}/episodes`)
      const saved = await r2.json()
      const smap = Array.isArray(saved) ? saved : []
      setEps(d.episodes.map((e) => {
        const rec = smap.find((s) => s.season_number === sn && s.episode_number === e.episode)
        return { ...e, season: sn, saved: rec || null }
      }))
    }
    setFetchingEps(false)
  }

  async function saveStream(episodeId = null) {
    if (!fUrl.trim()) { setErr('Isi URL stream dulu.'); return }
    setSaving(true); setErr(''); setNotice('')
    try {
      const payload = { server_name: fServer, stream_url: fUrl.trim(), episode_id: episodeId || null }
      const r = await fetch(`/api/catalog/${title.id}/streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal menyimpan')
      setNotice('✓ Server stream tersimpan.')
      setFUrl('')
      setFServer('Abyss Utama')
      if (title.type === 'series') loadEpisodes(season)
      else loadStreams(title.id)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function removeStream(streamId) {
    if (!confirm('Hapus server stream ini?')) return
    await fetch(`/api/catalog/${title.id}/streams?stream=${streamId}`, { method: 'DELETE' })
    if (title.type === 'series') loadEpisodes(season)
    else loadStreams(title.id)
  }

  // Reorder stream (drag-up/down via arrow)
  async function reorder(idxA, idxB) {
    if (idxA === idxB) return
    const order = [...streams]
    const [pindah] = order.splice(idxA, 1)
    order.splice(idxB, 0, pindah)
    // Optimistic UI
    const baru = order.map((_, i) => ({ ...streams.find((s) => s.id === order[i].id), priority: i + 1 }))
    setStreams(baru)
    try {
      const r = await fetch(`/api/catalog/${title.id}/streams/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: order.map((s) => s.id) }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Gagal reorder') }
      setNotice('✓ Urutan server diperbarui (server utama dipakai duluan).')
    } catch (e) {
      setErr(e.message)
      // rollback UI
      loadStreams(title.id)
    }
  }

  async function autoAddEpisodes() {
    setSaving(true); setErr(''); setNotice('')
    try {
      let count = 0
      for (const e of eps) {
        const r = await fetch(`/api/catalog/${title.id}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season_number: e.season, episode_number: e.episode, episode_title: e.nama, still_path: e.still, overview: e.overview }),
        })
        if (r.ok) count++
      }
      setNotice(`✓ ${count} episode tersimpan ke database.`)
      loadEpisodes(season)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  useEffect(() => {
    // Pola suspense-lokal: jangan setState sinkron di body effect.
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (hidup) bootstrap()
    })()
    return () => { hidup = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId])

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center text-slate-500">Memuat editor...</div>
  )

  if (notFoundCat && !title) return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col items-center justify-center text-slate-400 p-6">
      <p className="mb-4">Judul TMDB {tmdbId} belum ada di katalog.</p>
      <button onClick={() => router.push('/admin')} className="bg-indigo-600 px-4 py-2 rounded-lg text-white text-sm">Kembali ke Admin</button>
    </div>
  )

  const judul = title?.title || meta?.title || tmdbId
  const isSeries = title?.type === 'series'
  const embedUrl = isSeries
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/tv/${tmdbId}/${season}/1`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/movie/${tmdbId}`

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-slate-100 font-sans">
      <nav className="border-b border-white/5 bg-[#0b0f1a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
              <span className="material-icons text-lg">arrow_back</span>
            </button>
            <div className="flex-1">
              <h1 className="font-bold leading-tight truncate max-w-[60vw] text-sm">{judul}</h1>
              <p className="text-[11px] text-slate-500">
                {isSeries ? `TV Series • S{season}` : 'Movie'} • TMDB {tmdbId}
              </p>
            </div>
            {title && (
              <button
                onClick={async () => {
                  if (!confirm(`Hapus "${judul}" dari katalog secara permanen?`)) return
                  try {
                    const r = await fetch(`/api/catalog/${title.id}`, { method: 'DELETE' })
                    if (!r.ok) throw new Error('Server menolak')
                    toast.success(`${judul} dihapus`)
                    router.push('/admin')
                  } catch (e) {
                    toast.error('Gagal menghapus: ' + e.message)
                  }
                }}
                className="shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5 text-xs font-medium transition flex items-center gap-1"
                title="Hapus konten ini"
              >
                <span className="material-icons text-sm">delete</span>
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isSeries ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {isSeries ? 'Series' : 'Movie'}
          </span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Card URL Embed */}
        <div className="bg-[#161b2c] border border-white/5 rounded-2xl p-5 mb-6">
          <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">URL Embed untuk Piratestudio21</p>
          <div className="flex gap-2">
            <input readOnly value={embedUrl} className={inputCls + ' font-mono text-indigo-300'} />
            <button
              onClick={() => { navigator.clipboard.writeText(embedUrl); setNotice('✓ URL disalin.'); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-xs font-bold transition shrink-0"
            >Salin</button>
          </div>
          <details className="mt-3">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Kode Iframe</summary>
            <textarea readOnly rows={2} value={`<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`}
              className={inputCls + ' mt-2 font-mono text-[11px] text-emerald-300'} />
          </details>
        </div>

        {/* Tab — Movie cuma punya "Server Stream", Series cuma punya "Episode & Server" */}
        <div className="flex gap-2 mb-5">
          {!isSeries && (
            <button onClick={() => setTab('stream')} className={`${btnCls} ${tab === 'stream' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}>
              Server Stream
            </button>
          )}
          {isSeries && (
            <button onClick={() => setTab('episode')} className={`${btnCls} ${tab === 'episode' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}>
              Episode & Server
            </button>
          )}
        </div>

        {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl px-4 py-3 mb-4">{err}</div>}
        {notice && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl px-4 py-3 mb-4">{notice}</div>}

        {/* ===== TAB: STREAM (movie saja) ===== */}
        {!isSeries && tab === 'stream' && (
          <div className="bg-[#161b2c] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Tambah Server Stream</p>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              URL stream = link video asal (abyss / m3u8 / MP4). Nama server hanya label, mis. &quot;Abyss Utama&quot;.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input placeholder="Nama server" value={fServer} onChange={(e) => setFServer(e.target.value)} className={inputCls} />
              <input placeholder="URL stream / slug abyss" value={fUrl} onChange={(e) => setFUrl(e.target.value)} className={inputCls + ' sm:col-span-2'} />
            </div>
            <button onClick={() => saveStream(title ? title.id : null)} disabled={saving || !title}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition">
              {saving ? 'Menyimpan...' : 'Simpan Server'}
            </button>

            <p className="text-xs text-slate-400 mt-6 mb-2 font-semibold uppercase tracking-wider">Daftar Server ({streams.length})</p>
            {streams.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">Belum ada server. Tambahkan URL stream pertama.</p>
            ) : streams.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-2">
                <Arrows idx={i} total={streams.length} onMove={(a, b) => reorder(a, b)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.server_name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{s.stream_url}</p>
                </div>
                <button onClick={() => removeStream(s.id)} className="text-red-400 hover:text-red-300" title="Hapus server ini">
                  <span className="material-icons text-lg">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ===== TAB: EPISODE (series saja) ===== */}
        {tab === 'episode' && isSeries && (
          <div>
            {/* Pilih season */}
            <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
              <span className="text-xs text-slate-500 shrink-0">Season:</span>
              {seasons.map((s) => (
                <button key={s.season}
                  onClick={() => { setSeason(s.season); loadEpisodes(s.season) }}
                  className={`${btnCls} shrink-0 ${season === s.season ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                  S{s.season}
                </button>
              ))}
              <button onClick={autoAddEpisodes} disabled={saving}
                className={`${btnCls} shrink-0 bg-emerald-600/80 hover:bg-emerald-600 text-white ml-auto disabled:opacity-50`}>
                {saving ? 'Simpan...' : 'Simpan Semua Episode'}
              </button>
            </div>

            {fetchingEps ? (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Memuat episode...</div>
            ) : (
              <div className="space-y-3">
                {eps.map((e) => (
                  <div key={e.episode} className="bg-[#161b2c] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="flex gap-4 p-4">
                      <div className="w-28 shrink-0 rounded-lg overflow-hidden bg-slate-800 aspect-video">
                        {e.still ? <img src={e.still} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-500/15 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded">EP {e.episode}</span>
                          <h4 className="text-sm font-bold truncate">{e.nama}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{e.overview || 'Tidak ada deskripsi.'}</p>
                        <p className="text-[10px] text-slate-600 mt-1 font-mono">/tv/{tmdbId}/{e.season}/{e.episode}</p>
                      </div>
                    </div>

                    {/* Server untuk episode ini */}
                    <div className="px-4 pb-4 border-t border-white/5 pt-3">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Server Episode</p>
                      {(e.saved?.streams || []).map((s) => (
                        <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold">{s.server_name}</span>
                            <p className="text-[10px] text-slate-500 font-mono truncate">{s.stream_url}</p>
                          </div>
                          <button onClick={() => removeStream(s.id)} className="text-red-400 hover:text-red-300" title="Hapus server ini">
                            <span className="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                      {(e.saved?.streams || []).length === 0 && <p className="text-[11px] text-slate-600 mb-2">Belum ada server untuk episode ini.</p>}

                      <div className="flex gap-2 mt-2">
                        <input placeholder="Nama server (mis. Abyss Utama)" value={fServer} onChange={(ev) => setFServer(ev.target.value)} className={inputCls + ' flex-1'} />
                        <input placeholder="URL stream episode ini" value={fUrl} onChange={(ev) => setFUrl(ev.target.value)} className={inputCls + ' flex-[2]'} />
                        <button
                          onClick={async () => {
                            if (!fUrl.trim()) { setErr('Isi URL stream dulu.'); return }
                            setSaving(true); setErr(''); setNotice('')
                            try {
                              let epId = e.saved?.id
                              if (!epId) {
                                const rr = await fetch(`/api/catalog/${title.id}/episodes`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ season_number: e.season, episode_number: e.episode, episode_title: e.nama, still_path: e.still, overview: e.overview }),
                                })
                                const dd = await rr.json()
                                if (!rr.ok) throw new Error(dd.error || 'Gagal simpan episode')
                                epId = dd.id
                              }
                              await saveStream(epId)
                            } catch (ex) { setErr(ex.message); setSaving(false) }
                          }}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-xl text-xs font-bold transition shrink-0"
                        >+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
