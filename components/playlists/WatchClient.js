'use client'

// Halaman nonton langsung: /p/KODE/slug-judul/EP
// Player native + gate PIN (sesi per browser).
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sha256hex, tunnelBase } from '@/lib/playlist'
import VideoPlayer from '@/components/playlists/VideoPlayer'
import Ikon from '@/components/playlists/Ikon'

export default function WatchClient({ code, hasPinServer, item, epAwal }) {
  const router = useRouter()
  const [terkunci, setTerkunci] = useState(hasPinServer)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [ep, setEp] = useState(epAwal)
  const [tunnel, setTunnel] = useState('')

  useEffect(() => {
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (!hidup) return
      if (typeof window !== 'undefined' && sessionStorage.getItem('ps_unlock_' + code)) setTerkunci(false)
      setTunnel(await tunnelBase())
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

  const embeds = item.embeds || []
  const aktif = embeds.find((e) => Number(e.ep) === Number(ep)) || embeds[0]
  const url = aktif?.url || aktif?.embed || ''

  const pindahEp = (novo) => {
    setEp(novo)
    router.replace(`/p/${code}/${item.slug}/${novo}`)
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

  return (
    <div style={{ background: '#0b0f1a', minHeight: '100vh', color: '#eee' }}>
      <main style={{ maxWidth: 900, margin: 'auto', padding: '12px 16px 40px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <a href={`/p/${code}`} style={{ color: '#00a4dc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ikon nama="kembali" /> {code}</a>
          <span style={{ flex: 1 }} />
          <span style={{ color: '#888', fontSize: 13 }}>{item.title} {item.type === 'series' ? `· E${ep}` : ''}</span>
        </div>
        {url ? (
          <VideoPlayer key={ep + url} embedUrl={url} title={item.title} tunnel={tunnel} />
        ) : (
          <p style={{ color: '#f0ad4e' }}>Episode ini belum punya link tonton.</p>
        )}
        {item.type === 'series' && embeds.length > 1 && (
          <>
            <NavEp embeds={embeds} ep={ep} onPindah={pindahEp} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {embeds.map((e) => (
                <button key={e.ep} onClick={() => pindahEp(e.ep)}
                  style={Number(e.ep) === Number(ep) ? epOn : epBtn}>E{e.ep}</button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const tengah = { background: '#0b0f1a', minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const kotak = { background: '#141b2e', borderRadius: 12, padding: 20 }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 8 }
const btn = { width: '100%', padding: 12, background: '#00a4dc', color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 }
const epBtn = { padding: '8px 14px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer' }
const epOn = { ...epBtn, borderColor: '#00a4dc', color: '#00a4dc', fontWeight: 'bold' }

// Navigasi prev/next episode (tetangga terdekat yang ada linknya)
function NavEp({ embeds, ep, onPindah }) {
  const nos = [...new Set(embeds.map((e) => Number(e.ep)))].sort((a, b) => a - b)
  const i = nos.indexOf(Number(ep))
  const prev = i > 0 ? nos[i - 1] : null
  const next = i >= 0 && i < nos.length - 1 ? nos[i + 1] : null
  if (prev === null && next === null) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
      <button disabled={prev === null} onClick={() => onPindah(prev)} style={navBtn}><Ikon nama="chevKiri" size={14} /> E{prev ?? '–'}</button>
      <span style={{ color: '#888', fontSize: 13 }}>E{ep}</span>
      <button disabled={next === null} onClick={() => onPindah(next)} style={navBtn}>E{next ?? '–'} <Ikon nama="chevKanan" size={14} /></button>
    </div>
  )
}

const navBtn = { padding: '8px 14px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer' }
