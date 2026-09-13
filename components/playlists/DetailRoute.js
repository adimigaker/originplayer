'use client'

// Halaman detail 1 tayangan: /p/KODE/slug-judul
// Meta + daftar episode (link penuh = reload halaman). Tanpa autoplay.
import { useState, useEffect } from 'react'
import { tunnelBase, bacaProgress, simpanProgress } from '@/lib/playlist'
import { sha256hex } from '@/lib/playlist'
import Ikon from '@/components/playlists/Ikon'

export default function DetailRoute({ code, hasPinServer, item }) {
  const [terkunci, setTerkunci] = useState(hasPinServer)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [prog, setProg] = useState({})

  useEffect(() => {
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (!hidup) return
      if (typeof window !== 'undefined' && sessionStorage.getItem('ps_unlock_' + code)) setTerkunci(false)
      setProg(bacaProgress(code))
    })()
    return () => { hidup = false }
  }, [code])

  const bukaKunci = async (e) => {
    e.preventDefault()
    const r = await fetch('/api/playlists/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, pin_hash: await sha256hex(pin) }),
    })
    const j = await r.json()
    if (j.ok) {
      sessionStorage.setItem('ps_unlock_' + code, '1')
      setTerkunci(false)
    } else setPinErr('PIN salah.')
  }

  if (terkunci) {
    return (
      <div style={tengah}>
        <form onSubmit={bukaKunci} style={{ ...kotak, width: '100%', maxWidth: 360 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Ikon nama="kunci" /> {code}</h3>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus style={input} inputMode="numeric" />
          {pinErr && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{pinErr}</p>}
          <button type="submit" style={btn}>Buka</button>
        </form>
      </div>
    )
  }

  const embeds = item.embeds || []
  const linkEp = (n) => `/p/${code}/${item.slug}/${n}`

  return (
    <div style={{ background: '#0b0f1a', minHeight: '100vh', color: '#eee' }}>
      {item.backdrop && (
        <div style={{ height: 220, background: `url(${item.backdrop}) center/cover`, WebkitMaskImage: 'linear-gradient(#000, transparent)', maskImage: 'linear-gradient(#000, transparent)' }} />
      )}
      <main style={{ padding: '0 20px 40px', maxWidth: 900, margin: 'auto', marginTop: item.backdrop ? -60 : 12 }}>
        <a
          href={`/p/${code}`}
          onClick={(e) => { e.preventDefault(); window.location.assign(`/p/${code}`) }}
          style={{ color: '#00a4dc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative', zIndex: 2 }}
        >
          <Ikon nama="kembali" size={14} /> {code}
        </a>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {item.poster && <img src={item.poster} alt={item.title} style={{ width: 150, borderRadius: 8 }} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: '0 0 6px' }}>{item.title}</h1>
            <div style={{ color: '#888', fontSize: 13 }}>
              {[item.year, item.genre, item.duration].filter(Boolean).join(' • ')}
              {item.rating ? `  ★ ${item.rating}` : ''}
            </div>
            <p style={{ color: '#bbb', fontSize: 14 }}>{item.synopsis}</p>
            {item.cast && <p style={{ color: '#888', fontSize: 13 }}>Pemain: {item.cast}</p>}
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>{item.type === 'series' ? 'Episode' : 'Putar'}</h3>
        {embeds.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Belum ada link tonton.</p>}
        <div style={{ color: '#888', fontSize: 12, marginTop: 14, marginBottom: 8, textAlign: 'center' }}>
          {item.type === 'series' ? `Semua episode (${embeds.length})` : 'Tonton'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          {[...embeds].sort((a, b) => Number(a.ep) - Number(b.ep)).map((e) => {
            const ditonton = prog[item.id + ':' + e.ep]
            return (
              <a key={e.ep} href={linkEp(e.ep)} style={{
                padding: '10px 0', background: '#222b45', color: ditonton ? '#00a4dc' : '#fff',
                border: '1px solid #333d5c', borderColor: ditonton ? '#00a4dc' : '#333d5c',
                borderRadius: 10, textDecoration: 'none', fontSize: 14, textAlign: 'center',
                fontWeight: ditonton ? 'bold' : 'normal',
              }}>
                {item.type === 'series' ? 'E' + e.ep : 'Putar'}{ditonton ? ' ✓' : ''}
              </a>
            )
          })}
        </div>
      </main>
    </div>
  )
}

const tengah = { background: '#0b0f1a', minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const kotak = { background: '#141b2e', borderRadius: 12, padding: 20 }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 8 }
const btn = { width: '100%', padding: 12, background: '#00a4dc', color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 }
const epBtn = { padding: '8px 14px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', textDecoration: 'none', fontSize: 14 }
