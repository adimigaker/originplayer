'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { kodeOke, kodeTerlaluUmum } from '@/lib/playlist'

const BG = '#0b0f1a'
const CARD = '#141b2e'
const AKSEN = '#00a4dc'

export default function PlaylistLanding() {
  const router = useRouter()
  const [mode, setMode] = useState(null) // 'buat' | 'muat'
  const [kode, setKode] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const k = kode.trim()
    if (!kodeOke(k)) {
      setErr('Kode hanya boleh huruf, angka, - dan _ (tanpa spasi).')
      return
    }
    router.push('/p/' + encodeURIComponent(k) + (mode === 'buat' ? '?baru=1' : ''))
  }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 4 }}>Playlist Saya</h1>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 28 }}>
          Tanpa akun. Cukup kode — yang pegang kode, pegang playlist.
        </p>

        {!mode && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setMode('buat'); setErr('') }} style={btnUtama}>Buat Playlist</button>
            <button onClick={() => { setMode('muat'); setErr('') }} style={btnKedua}>Muat Playlist</button>
          </div>
        )}

        {mode && (
          <form onSubmit={submit} style={{ background: CARD, borderRadius: 12, padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{mode === 'buat' ? 'Kode playlist baru' : 'Masukkan kode playlist'}</h3>
            <input
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              placeholder="misal: Koleksi-BuahHati_21"
              autoFocus
              style={input}
            />
            {mode === 'buat' && kodeTerlaluUmum(kode.trim()) && (
              <p style={{ color: '#f0ad4e', fontSize: 13 }}>
                Kode ini terlalu umum dan gampang ditebak orang — pakai yang lebih unik ya.
              </p>
            )}
            {err && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{err}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={btnUtama}>{mode === 'buat' ? 'Buat' : 'Masuk'}</button>
              <button type="button" onClick={() => { setMode(null); setKode(''); setErr('') }} style={btnKedua}>Kembali</button>
            </div>
            {mode === 'buat' && (
              <p style={{ color: '#888', fontSize: 12, marginBottom: 0 }}>
                Huruf besar-kecil beda. Boleh angka. Simbol cuma - dan _. Minimal 4 karakter biar aman.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

const btnUtama = { flex: 1, padding: '12px 0', background: AKSEN, color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }
const btnKedua = { flex: 1, padding: '12px 0', background: '#222b45', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer', fontSize: 15 }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box' }
