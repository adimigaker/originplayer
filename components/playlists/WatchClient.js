'use client'

// Halaman nonton langsung: /p/KODE/slug-judul/EP
// Player native (tidak autoplay) + gate PIN. Navigasi antar episode = reload.
import { useState, useEffect } from 'react'
import { sha256hex, tunnelBase, simpanProgress, bacaProgress, hapusProgress } from '@/lib/playlist'
import VideoPlayer from '@/components/playlists/VideoPlayer'
import Ikon from '@/components/playlists/Ikon'

export default function WatchClient({ code, hasPinServer, item, epAwal }) {
  const [terkunci, setTerkunci] = useState(hasPinServer)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [ep, setEp] = useState(epAwal)
  const [tunnel, setTunnel] = useState('')
  const [ditonton, setDitonton] = useState(false)

  useEffect(() => {
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (!hidup) return
      if (typeof window !== 'undefined' && sessionStorage.getItem('ps_unlock_' + code)) setTerkunci(false)
      setTunnel(await tunnelBase())
      setDitonton(!!bacaProgress(code)[item.id + ':' + epAwal])
    })()
    return () => { hidup = false }
  }, [code])

  const toggleTonton = () => {
    if (ditonton) hapusProgress(code, item.id, ep)
    else simpanProgress(code, item.id, ep, 0, 0)
    setDitonton(!ditonton)
  }

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
  const linkEp = (n) => `/p/${code}/${item.slug}/${n}`

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
          <a href={`/p/${code}/${item.slug}`} style={{ color: '#00a4dc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Ikon nama="kembali" size={14} /> {item.title}
          </a>
          <span style={{ flex: 1 }} />
          <span style={{ color: '#888', fontSize: 13 }}>{item.type === 'series' ? `E${ep}` : ''}</span>
        </div>
        {url ? (
          <VideoPlayer
            key={ep + url}
            embedUrl={url}
            title={`${item.title}${item.type === 'series' ? ' E' + ep : ''}`}
            tunnel={tunnel}
            onPertamaPutar={() => simpanProgress(code, item.id, ep, 0, 0)}
          />
        ) : (
          <p style={{ color: '#f0ad4e' }}>Episode ini belum punya link tonton.</p>
        )}
        {item.type === 'series' && embeds.length > 1 && (
          <section style={{ maxWidth: 560, margin: '6px auto 0' }}>
            <NavEp code={code} slug={item.slug} embeds={embeds} ep={ep} />
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button onClick={toggleTonton} style={ditonton ? tontonOn : tontonBtn}>
                <Ikon nama="cek" size={14} /> {ditonton ? 'Sudah ditonton — batalkan' : 'Tandai sudah ditonton'}
              </button>
            </div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 14, marginBottom: 8, textAlign: 'center' }}>
              Semua episode ({embeds.length})
            </div>
            <div style={gridEp}>
              {[...embeds].sort((a, b) => Number(a.ep) - Number(b.ep)).map((e) => (
                <a key={e.ep} href={linkEp(e.ep)}
                  style={Number(e.ep) === Number(ep) ? epOnGrid : epGrid}>E{e.ep}</a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// Navigasi prev/next episode via link penuh (reload halaman) — selalu di tengah
function NavEp({ code, slug, embeds, ep }) {
  const nos = [...new Set(embeds.map((e) => Number(e.ep)))].sort((a, b) => a - b)
  const i = nos.indexOf(Number(ep))
  const prev = i > 0 ? nos[i - 1] : null
  const next = i >= 0 && i < nos.length - 1 ? nos[i + 1] : null
  if (prev === null && next === null) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 14 }}>
      {prev === null ? (
        <span style={navMati}><Ikon nama="chevKiri" size={14} /></span>
      ) : (
        <a href={`/p/${code}/${slug}/${prev}`} style={navBtn}><Ikon nama="chevKiri" size={14} /> E{prev}</a>
      )}
      <span style={navTengah}>E{ep} / {nos.length}</span>
      {next === null ? (
        <span style={navMati}><Ikon nama="chevKanan" size={14} /></span>
      ) : (
        <a href={`/p/${code}/${slug}/${next}`} style={navBtn}>E{next} <Ikon nama="chevKanan" size={14} /></a>
      )}
    </div>
  )
}

const tengah = { background: '#0b0f1a', minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const kotak = { background: '#141b2e', borderRadius: 12, padding: 20 }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 8 }
const btn = { width: '100%', padding: 12, background: '#00a4dc', color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginTop: 12 }
const epBtn = { padding: '8px 14px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', textDecoration: 'none', fontSize: 14 }
const epOn = { ...epBtn, borderColor: '#00a4dc', color: '#00a4dc', fontWeight: 'bold' }
const navBtn = { padding: '10px 18px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 10, cursor: 'pointer', textDecoration: 'none', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 96, justifyContent: 'center' }
const tontonBtn = { padding: '8px 16px', background: 'transparent', color: '#888', border: '1px dashed #333d5c', borderRadius: 10, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }
const tontonOn = { ...tontonBtn, color: '#00a4dc', borderColor: '#00a4dc', borderStyle: 'solid' }
const navMati = { ...navBtn, opacity: 0.35 }
const navTengah = { color: '#fff', fontSize: 14, fontWeight: 'bold', minWidth: 72, textAlign: 'center' }
const gridEp = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 8 }
const epGrid = { padding: '10px 0', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 10, cursor: 'pointer', textDecoration: 'none', fontSize: 14, textAlign: 'center' }
const epOnGrid = { ...epGrid, borderColor: '#00a4dc', color: '#00a4dc', fontWeight: 'bold' }
