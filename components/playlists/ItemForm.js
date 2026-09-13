'use client'

import { useState } from 'react'
import { slugify } from '@/lib/playlist'
import Ikon from '@/components/playlists/Ikon'

const AKSEN = '#00a4dc'

// Form tambah/edit film & series. Autofill dari URL IMDb/TMDB, bisa skip manual.
// Episode ala ps21dash: kartu per episode, edit nomor, sisip atas/bawah, hapus, urutkan.
export default function ItemForm({ code, type, awal, onTutup, onSimpan }) {
  const [tipe, setTipe] = useState(awal?.type || type)
  const [cari, setCari] = useState('')
  const [hasil, setHasil] = useState([])
  const [info, setInfo] = useState('')
  const [editEp, setEditEp] = useState(null)
  const [tmpEp, setTmpEp] = useState(1)
  const [f, setF] = useState(() => ({
    title: awal?.title || '',
    slug: awal?.slug || '',
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

  const sisip = (i, arah) => {
    setF((s) => {
      const arr = [...s.embeds]
      const no = (arr[i]?.ep || 1) + arah
      if (no < 1) return s
      arr.splice(i + (arah > 0 ? 1 : 0), 0, { ep: no, url: '' })
      return { ...s, embeds: arr }
    })
  }

  const hapusEp = (i) => {
    setF((s) => ({ ...s, embeds: s.embeds.filter((_, k) => k !== i) }))
  }

  const urutkan = () => {
    setF((s) => ({ ...s, embeds: [...s.embeds].sort((a, b) => (a.ep || 0) - (b.ep || 0)) }))
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
      slug: f.slug.trim() || undefined,
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
      embeds: f.embeds
        .filter((e) => (e.url || e.embed || '').trim())
        .sort((a, b) => (a.ep || 0) - (b.ep || 0))
        .map((e) => ({ ep: e.ep || 1, url: (e.url || e.embed || '').trim() })),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, flex: 1 }}>{awal?.id ? 'Edit' : 'Tambah'} {tipe === 'series' ? 'Series' : 'Film'}</h2>
          <button onClick={onTutup} style={btnKecil} title="Tutup"><Ikon nama="tutup" size={16} /></button>
        </div>

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
        <label style={lbl}>Slug URL (kosongkan = otomatis dari judul)</label>
        <input value={f.slug} onChange={(e) => set('slug', e.target.value)} style={input} placeholder={slugify(f.title)} />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...lbl, flex: 1 }}>{tipe === 'series' ? `Link tonton per episode (${f.embeds.length})` : 'Link tonton (URL seeks / abyss / MP4)'}</label>
          {tipe === 'series' && <button onClick={urutkan} style={{ ...btnIkon, marginTop: 12 }} title="Urutkan menurut nomor"><Ikon nama="urut" size={14} /> Urutkan</button>}
        </div>
        {f.embeds.map((e, i) => (
          <div key={i} style={epCard}>
            <div style={epHead}>
              {editEp === i ? (
                <>
                  <input type="number" min={1} value={tmpEp} onChange={(ev) => setTmpEp(ev.target.value)} style={{ ...input, marginTop: 0, width: 80 }} />
                  <button onClick={() => { setEp(i, 'ep', tmpEp); setEditEp(null) }} style={btnKecil}>Simpan</button>
                </>
              ) : (
                <>
                  <b>E{e.ep}</b>
                  <button onClick={() => { setEditEp(i); setTmpEp(e.ep) }} style={btnKecil} title="Edit nomor"><Ikon nama="edit" size={14} /></button>
                </>
              )}
              <span style={{ flex: 1 }} />
              {tipe === 'series' && <button title="Sisip episode di atas" onClick={() => sisip(i, -1)} style={btnKecil}><Ikon nama="panahAtas" size={14} /></button>}
              {tipe === 'series' && <button title="Sisip episode di bawah" onClick={() => sisip(i, 1)} style={btnKecil}><Ikon nama="panahBawah" size={14} /></button>}
              <button title="Hapus episode" onClick={() => hapusEp(i)} style={btnKecil}><Ikon nama="tutup" size={14} /></button>
            </div>
            <input value={e.url || e.embed || ''} onChange={(ev) => setEp(i, 'url', ev.target.value)} placeholder="https://..." style={{ ...input, marginTop: 6 }} />
          </div>
        ))}
        {tipe === 'series' && (
          <button onClick={() => setF((s) => {
            const maks = s.embeds.reduce((m, e) => Math.max(m, e.ep || 0), 0)
            return { ...s, embeds: [...s.embeds, { ep: maks + 1, url: '' }] }
          })} style={{ ...btnIkon, marginTop: 8 }}><Ikon nama="plus" size={14} /> Episode di akhir</button>
        )}

        {simpanInfo && <p style={{ color: '#f0ad4e', fontSize: 13 }}>{simpanInfo}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={simpan} style={btnUtama}><Ikon nama="cek" size={15} /> Simpan</button>
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
const btnUtama = { padding: '10px 18px', background: AKSEN, color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const btnKedua = { padding: '10px 18px', background: '#222b45', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }
const btnKecil = { padding: '8px 10px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', fontSize: 13 }
const btnIkon = { padding: '8px 12px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }
const baris = { display: 'flex', gap: 8, marginBottom: 4 }
const tab = { flex: 1, padding: 10, background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer' }
const tabOn = { ...tab, borderColor: AKSEN, color: AKSEN, fontWeight: 'bold' }
const hasilBtn = { display: 'flex', gap: 8, alignItems: 'center', background: '#0b0f1a', border: '1px solid #333d5c', borderRadius: 8, color: '#fff', padding: 6, cursor: 'pointer', maxWidth: 200, textAlign: 'left' }
const epCard = { background: '#0b0f1a', border: '1px solid #333d5c', borderRadius: 8, padding: 10, marginTop: 8 }
const epHead = { display: 'flex', alignItems: 'center', gap: 8 }
