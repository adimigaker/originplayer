'use client'

import { useState } from 'react'
import { sha256hex } from '@/lib/playlist'

const AKSEN = '#00a4dc'

// Form tambah/edit film & series. Autofill dari URL IMDb/TMDB, bisa skip manual.
export default function ItemForm({ code, type, awal, onTutup, onSimpan }) {
  const [tipe, setTipe] = useState(awal?.type || type)
  const [cari, setCari] = useState('')
  const [hasil, setHasil] = useState([])
  const [info, setInfo] = useState('')
  const [f, setF] = useState(() => ({
    title: awal?.title || '',
    year: awal?.year || '',
    poster: awal?.poster || '',
    backdrop: awal?.backdrop || '',
    synopsis: awal?.synopsis || '',
    genre: awal?.genre || '',
    rating: awal?.rating || '',
    cast: awal?.cast || '',
    director: awal?.director || '',
    duration: awal?.duration || '',
    tmdb_id: awal?.tmdb_id || '',
    imdb_id: awal?.imdb_id || '',
    embeds: awal?.embeds?.length ? awal.embeds : [{ ep: 1, url: '' }],
    downloads: awal?.downloads?.length ? awal.downloads : [],
  }))
  const [simpanInfo, setSimpanInfo] = useState('')

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  const ambilUrl = async () => {
    setInfo('Mengambil metadata...')
    setHasil([])
    try {
      let u = '/api/tmdb?'
      if (/imdb\.com|tt\d+/.test(cari)) {
        const m = cari.match(/tt\d+/)
        if (!m) { setInfo('ID IMDb tidak ketemu di teks itu.'); return }
        u += 'imdb=' + m[0]
      } else if (/themoviedb\.org/.test(cari)) {
        const m = cari.match(/\/(movie|tv)\/(\d+)/)
        if (!m) { setInfo('URL TMDB tidak dikenali.'); return }
        u += `tmdb=${m[2]}&media=${m[1]}`
      } else {
        // anggap judul
        const r = await (await fetch(`/api/tmdb?search=${encodeURIComponent(cari)}&media=${tipe === 'series' ? 'tv' : 'movie'}`)).json()
        if (r.error) { setInfo(r.error); return }
        if (!r.length) { setInfo('Tidak ketemu. Coba kata lain / isi manual.'); return }
        setHasil(r)
        setInfo('')
        return
      }
      const j = await (await fetch(u)).json()
      if (j.error) { setInfo(j.error + (j.error.includes('TMDB_API_KEY') ? ' (minta pemilik web pasang key)' : '')); return }
      terapkan(j)
      setInfo('Metadata terisi — cek lalu simpan.')
    } catch (e) {
      setInfo('Gagal: ' + e.message)
    }
  }

  const terapkan = (j) => {
    setF((s) => ({
      ...s,
      title: j.title || s.title,
      year: j.year || s.year,
      poster: j.poster || s.poster,
      backdrop: j.backdrop || s.backdrop,
      synopsis: j.synopsis || s.synopsis,
      genre: j.genre || s.genre,
      rating: j.rating || s.rating,
      cast: j.cast || s.cast,
      director: j.director || s.director,
      tmdb_id: j.tmdb_id || s.tmdb_id,
      imdb_id: j.imdb_id || s.imdb_id,
    }))
    if (j.media === 'tv' || /tv/.test(String(j.media))) setTipe('series')
  }

  const setEp = (i, k, v) => {
    setF((s) => {
      const arr = [...s.embeds]
      arr[i] = { ...arr[i], [k]: k === 'ep' ? parseInt(v) || 1 : v }
      return { ...s, embeds: arr }
    })
  }

  const simpan = async () => {
    if (!f.title.trim()) { setSimpanInfo('Judul wajib.'); return }
    setSimpanInfo('Menyimpan...')
    const pin = sessionStorage.getItem('ps_pin_' + code) || ''
    const body = {
      playlist_code: code,
      pin_hash: pin,
      type: tipe,
      title: f.title.trim(),
      year: f.year || null,
      poster: f.poster || null,
      backdrop: f.backdrop || null,
      synopsis: f.synopsis || null,
      genre: f.genre || null,
      rating: f.rating || null,
      cast: f.cast || null,
      director: f.director || null,
      duration: f.duration || null,
      tmdb_id: f.tmdb_id || null,
      imdb_id: f.imdb_id || null,
      embeds: f.embeds.filter((e) => (e.url || e.embed || '').trim()).map((e) => ({ ep: e.ep || 1, url: (e.url || e.embed || '').trim() })),
      downloads: f.downloads,
    }
    const method = awal?.id ? 'PUT' : 'POST'
    if (awal?.id) body.id = awal.id
    const r = await fetch('/api/playlists/items', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await r.json()
    if (j.error) setSimpanInfo(j.error)
    else onSimpan()
  }

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onTutup() }}>
      <div style={kotak}>
        <h2 style={{ marginTop: 0 }}>{awal?.id ? 'Edit' : 'Tambah'} {tipe === 'series' ? 'Series' : 'Film'}</h2>

        <div style={baris}>
          <button onClick={() => setTipe('movie')} style={tipe === 'movie' ? tabOn : tab}>Film</button>
          <button onClick={() => setTipe('series')} style={tipe === 'series' ? tabOn : tab}>Series</button>
        </div>

        <label style={lbl}>Tempel URL IMDb / TMDB / judul (opsional — skip kalau manual)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="https://www.imdb.com/title/tt... atau judul" style={{ ...input, marginTop: 0, flex: 1 }} />
          <button onClick={ambilUrl} style={btnUtama}>Ambil</button>
        </div>
        {info && <p style={{ color: '#888', fontSize: 13 }}>{info}</p>}
        {hasil.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {hasil.map((h) => (
              <button key={h.tmdb_id} onClick={async () => {
                const j = await (await fetch(`/api/tmdb?tmdb=${h.tmdb_id}&media=${h.media}`)).json()
                if (!j.error) { terapkan(j); setHasil([]); setInfo('Metadata terisi — cek lalu simpan.') }
              }} style={hasilBtn}>
                {h.poster && <img src={h.poster} alt="" style={{ width: 60, borderRadius: 4 }} />}
                <span style={{ fontSize: 12 }}>{h.title} {h.year ? `(${h.year})` : ''}</span>
              </button>
            ))}
          </div>
        )}

        <label style={lbl}>Judul *</label>
        <input value={f.title} onChange={(e) => set('title', e.target.value)} style={input} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Tahun</label><input value={f.year} onChange={(e) => set('year', e.target.value)} style={input} inputMode="numeric" /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Rating</label><input value={f.rating} onChange={(e) => set('rating', e.target.value)} style={input} inputMode="decimal" /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Durasi</label><input value={f.duration} onChange={(e) => set('duration', e.target.value)} style={input} placeholder="2j 10m" /></div>
        </div>
        <label style={lbl}>Poster URL</label>
        <input value={f.poster} onChange={(e) => set('poster', e.target.value)} style={input} />
        <label style={lbl}>Backdrop URL</label>
        <input value={f.backdrop} onChange={(e) => set('backdrop', e.target.value)} style={input} />
        <label style={lbl}>Sinopsis</label>
        <textarea value={f.synopsis} onChange={(e) => set('synopsis', e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
        <label style={lbl}>Genre</label>
        <input value={f.genre} onChange={(e) => set('genre', e.target.value)} style={input} placeholder="Aksi, Drama" />
        <label style={lbl}>Pemain</label>
        <input value={f.cast} onChange={(e) => set('cast', e.target.value)} style={input} />
        <label style={lbl}>Sutradara</label>
        <input value={f.director} onChange={(e) => set('director', e.target.value)} style={input} />

        <label style={lbl}>{tipe === 'series' ? 'Link tonton per episode (URL seeks / abyss / MP4)' : 'Link tonton (URL seeks / abyss / MP4)'}</label>
        {f.embeds.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {tipe === 'series' && (
              <input type="number" min={1} value={e.ep} onChange={(ev) => setEp(i, 'ep', ev.target.value)} style={{ ...input, marginTop: 0, width: 70 }} />
            )}
            <input value={e.url || e.embed || ''} onChange={(ev) => setEp(i, 'url', ev.target.value)} placeholder="https://..." style={{ ...input, marginTop: 0, flex: 1 }} />
            <button onClick={() => setF((s) => ({ ...s, embeds: s.embeds.filter((_, k) => k !== i) }))} style={btnKecil}>✕</button>
          </div>
        ))}
        {tipe === 'series' && (
          <button onClick={() => setF((s) => ({ ...s, embeds: [...s.embeds, { ep: (s.embeds.length + 1), url: '' }] }))} style={{ ...btnKecil, marginTop: 8 }}>+ Episode</button>
        )}

        {simpanInfo && <p style={{ color: '#f0ad4e', fontSize: 13 }}>{simpanInfo}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={simpan} style={btnUtama}>Simpan</button>
          <button onClick={onTutup} style={btnKedua}>Batal</button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 50, overflowY: 'auto', padding: 16 }
const kotak = { background: '#141b2e', borderRadius: 12, padding: 20, maxWidth: 640, margin: '20px auto', color: '#eee' }
const lbl = { display: 'block', fontSize: 12, color: '#888', marginTop: 12 }
const input = { width: '100%', padding: 10, fontSize: 14, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 4 }
const btnUtama = { padding: '10px 18px', background: AKSEN, color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }
const btnKedua = { padding: '10px 18px', background: '#222b45', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }
const btnKecil = { padding: '8px 10px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', fontSize: 13 }
const baris = { display: 'flex', gap: 8, marginBottom: 4 }
const tab = { flex: 1, padding: 10, background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer' }
const tabOn = { ...tab, borderColor: AKSEN, color: AKSEN, fontWeight: 'bold' }
const hasilBtn = { display: 'flex', gap: 8, alignItems: 'center', background: '#0b0f1a', border: '1px solid #333d5c', borderRadius: 8, color: '#fff', padding: 6, cursor: 'pointer', maxWidth: 200, textAlign: 'left' }
