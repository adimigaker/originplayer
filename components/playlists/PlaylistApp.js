'use client'

import { useState, useEffect, useCallback } from 'react'
import { sha256hex, tunnelBase, bacaProgress, simpanProgress, slugify } from '@/lib/playlist'
import ItemForm from '@/components/playlists/ItemForm'
import VideoPlayer from '@/components/playlists/VideoPlayer'

const BG = '#0b0f1a'
const CARD = '#141b2e'
const AKSEN = '#00a4dc'

export default function PlaylistApp({ code, has_pin }) {
  const [terkunci, setTerkunci] = useState(has_pin)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [items, setItems] = useState(null)
  const [lihat, setLihat] = useState({ nama: 'home' }) // home | detail | form
  const [tunnel, setTunnel] = useState('')
  const [prog, setProg] = useState({})

  const muat = useCallback(async () => {
    const r = await fetch('/api/playlists/items?code=' + encodeURIComponent(code))
    setItems(await r.json())
  }, [code])

  useEffect(() => {
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (!hidup) return
      if (typeof window !== 'undefined' && sessionStorage.getItem('ps_unlock_' + code)) {
        setTerkunci(false)
      }
      setTunnel(await tunnelBase())
      setProg(bacaProgress(code))
    })()
    return () => { hidup = false }
  }, [code])

  useEffect(() => {
    if (terkunci) return
    let hidup = true
    ;(async () => {
      const r = await fetch('/api/playlists/items?code=' + encodeURIComponent(code))
      const j = await r.json()
      if (hidup) setItems(j)
    })()
    return () => { hidup = false }
  }, [terkunci, code])

  const bukaKunci = async (e) => {
    e.preventDefault()
    const h = await sha256hex(pin)
    const r = await fetch('/api/playlists/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, pin_hash: h }),
    })
    const j = await r.json()
    if (j.ok) {
      sessionStorage.setItem('ps_unlock_' + code, '1')
      sessionStorage.setItem('ps_pin_' + code, h)
      setTerkunci(false)
    } else {
      setPinErr('PIN salah.')
    }
  }

  const aturPin = async () => {
    const cur = sessionStorage.getItem('ps_pin_' + code) || ''
    const aktif = document.getElementById('pinState')?.dataset.on === '1'
    const p1 = prompt(aktif ? 'PIN lama:' : 'Buat PIN baru (4-32 karakter, kosongkan untuk batal):')
    if (p1 === null || p1 === '') return
    let curHash = cur
    let baru = p1
    if (aktif) {
      curHash = await sha256hex(p1)
      const p2 = prompt('PIN baru:')
      if (p2 === null || p2 === '') return
      baru = p2
    }
    const r = await fetch('/api/playlists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, pin_hash: await sha256hex(baru), pin_current: curHash || undefined }),
    })
    const j = await r.json()
    if (j.error) alert(j.error)
    else {
      sessionStorage.setItem('ps_pin_' + code, await sha256hex(baru))
      alert('PIN ' + (j.has_pin ? 'aktif.' : 'mati.'))
      location.reload()
    }
  }

  if (terkunci) {
    return (
      <div style={tengah}>
        <form onSubmit={bukaKunci} style={{ ...CARD_, width: '100%', maxWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>🔒 {code}</h3>
          <p style={{ color: '#888', fontSize: 13 }}>Playlist ini dikunci. Masukkan PIN.</p>
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus style={input} inputMode="numeric" />
          {pinErr && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{pinErr}</p>}
          <button type="submit" style={btnUtama}>Buka</button>
        </form>
      </div>
    )
  }

  const film = (items || []).filter((x) => x.type === 'movie')
  const series = (items || []).filter((x) => x.type === 'series')
  const kunci = (items || []).length === 0

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#eee' }}>
      <header style={header}>
        <a href="/playlists" style={{ color: AKSEN, textDecoration: 'none' }}>←</a>
        <b style={{ fontSize: 18 }}>{code}</b>
        <span style={{ flex: 1 }} />
        <button onClick={aturPin} style={btnKecil}>🔒 PIN</button>
        <button onClick={() => setLihat({ nama: 'form', type: 'movie' })} style={btnKecil}>+ Film</button>
        <button onClick={() => setLihat({ nama: 'form', type: 'series' })} style={btnKecil}>+ Series</button>
      </header>

      <span id="pinState" data-on={has_pin ? '1' : '0'} style={{ display: 'none' }} />

      {lihat.nama === 'form' && (
        <ItemForm
          code={code}
          type={lihat.type}
          awal={lihat.item || null}
          onTutup={() => setLihat({ nama: 'home' })}
          onSimpan={() => { setLihat({ nama: 'home' }); muat() }}
        />
      )}

      {lihat.nama === 'detail' && (
        <Detail
          item={lihat.item}
          tunnel={tunnel}
          code={code}
          onKembali={() => setLihat({ nama: 'home' })}
          onEdit={() => setLihat({ nama: 'form', type: lihat.item.type, item: lihat.item })}
          onHapus={async () => {
            if (!confirm('Hapus dari playlist?')) return
            const p = sessionStorage.getItem('ps_pin_' + code) || ''
            await fetch(`/api/playlists/items?id=${lihat.item.id}&code=${encodeURIComponent(code)}&pin=${p}`, { method: 'DELETE' })
            setLihat({ nama: 'home' })
            muat()
          }}
          onPutar={(ep) => {
            simpanProgress(code, lihat.item.id, ep, 0, 0)
            setProg(bacaProgress(code))
          }}
        />
      )}

      {lihat.nama === 'home' && items === null && <p style={{ padding: 24, color: '#888' }}>Memuat...</p>}

      {lihat.nama === 'home' && items !== null && (
        <main style={{ padding: '4px 20px 40px', maxWidth: 1100, margin: 'auto' }}>
          {kunci ? (
            <div style={{ ...CARD_, textAlign: 'center', padding: 40, marginTop: 30 }}>
              <div style={{ fontSize: 48 }}>🎬</div>
              <h2>Playlist masih kosong</h2>
              <p style={{ color: '#888' }}>Tambahkan film atau series pertama ke library-mu.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setLihat({ nama: 'form', type: 'movie' })} style={btnUtama}>+ Tambah Film</button>
                <button onClick={() => setLihat({ nama: 'form', type: 'series' })} style={btnKedua}>+ Tambah Series</button>
              </div>
            </div>
          ) : (
            <>
              <Rak judul="🎬 Film" isi={film} onPilih={(item) => setLihat({ nama: 'detail', item })} prog={prog} />
              <Rak judul="📺 Series" isi={series} onPilih={(item) => setLihat({ nama: 'detail', item })} prog={prog} />
            </>
          )}
          <p style={{ marginTop: 30 }}>
            <Bagikan code={code} />
          </p>
        </main>
      )}
    </div>
  )
}

function Rak({ judul, isi, onPilih, prog }) {
  if (!isi.length) return null
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18 }}>{judul} <span style={{ color: '#666', fontSize: 13 }}>{isi.length}</span></h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {isi.map((it) => {
          const eps = (it.embeds || []).map((e) => e.ep)
          const lanjut = eps.some((ep) => prog[it.id + ':' + ep])
          return (
            <div key={it.id} onClick={() => onPilih(it)} style={{ cursor: 'pointer' }}>
              <div style={{ position: 'relative', aspectRatio: '2/3', background: '#222b45', borderRadius: 8, overflow: 'hidden' }}>
                {it.poster && <img src={it.poster} alt={it.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {lanjut && <span style={badge}>Lanjut</span>}
              </div>
              <div style={{ fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{it.year || ''}{it.rating ? ` ★ ${it.rating}` : ''}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Detail({ item, tunnel, code, onKembali, onEdit, onHapus, onPutar }) {
  const [ep, setEp] = useState(1)
  const [salin, setSalin] = useState(false)
  const embeds = item.embeds || []
  const slug = item.slug || slugify(item.title)

  const pilihEp = (e) => {
    setEp(e.ep)
    onPutar(e.ep)
  }
  const urlEp = (e) => (e ? (e.url || e.embed || '') : '')
  const linkEp = (n) => (typeof window !== 'undefined' ? window.location.origin : '') + `/p/${code}/${slug}/${n}`
  const aktif = embeds.find((e) => Number(e.ep) === Number(ep)) || embeds[0]

  return (
    <div>
      {item.backdrop && (
        <div style={{ height: 220, background: `url(${item.backdrop}) center/cover`, WebkitMaskImage: 'linear-gradient(#000, transparent)', maskImage: 'linear-gradient(#000, transparent)' }} />
      )}
      <main style={{ padding: '0 20px 40px', maxWidth: 900, margin: 'auto', marginTop: item.backdrop ? -60 : 12 }}>
        <button onClick={onKembali} style={btnKecil}>← Kembali</button>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onEdit} style={btnKecil}>✏️ Edit</button>
              <button onClick={onHapus} style={{ ...btnKecil, color: '#ff6b6b' }}>🗑 Hapus</button>
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>{item.type === 'series' ? 'Episode' : 'Putar'}</h3>
        {embeds.length === 0 && <p style={{ color: '#888', fontSize: 13 }}>Belum ada link tonton. Tambahkan lewat Edit.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {embeds.map((e) => (
            <button key={e.ep} onClick={() => pilihEp(e)} style={{ ...btnKecil, ...(Number(e.ep) === Number(ep) ? { borderColor: AKSEN, color: AKSEN } : {}) }}>
              {item.type === 'series' ? 'E' + e.ep : '▶ Putar'}
            </button>
          ))}
        </div>

        {aktif && urlEp(aktif) ? (
          <div style={{ marginTop: 16 }}>
            <VideoPlayer key={ep + urlEp(aktif)} embedUrl={urlEp(aktif)} title={item.title} tunnel={tunnel} onPertamaPutar={() => onPutar(ep)} />
            {item.type === 'series' && <NavEp embeds={embeds} ep={aktif.ep} onPindah={(n) => pilihEp({ ep: n })} />}
            <button
              onClick={() => { navigator.clipboard?.writeText(linkEp(aktif.ep)); setSalin(true); setTimeout(() => setSalin(false), 2000) }}
              style={{ ...btnKecil, marginTop: 8 }}
            >
              {salin ? 'Link disalin!' : `🔗 Salin link E${aktif.ep}`}
            </button>
          </div>
        ) : (
          embeds.length > 0 && <p style={{ color: '#f0ad4e', fontSize: 13 }}>Episode ini belum punya link tonton.</p>
        )}
      </main>
    </div>
  )
}

function Bagikan({ code }) {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== 'undefined' ? window.location.origin + '/p/' + code : '/p/' + code
  return (
    <span style={{ color: '#888', fontSize: 13 }}>
      🔗 Link share: <code style={{ color: '#bbb' }}>{link}</code>{' '}
      <button
        onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        style={btnKecil}
      >
        {copied ? 'Disalin!' : 'Salin'}
      </button>
    </span>
  )
}

const tengah = { background: BG, minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const CARD_ = { background: CARD, borderRadius: 12, padding: 20 }
const header = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #1c2440', position: 'sticky', top: 0, background: BG, zIndex: 5 }
const btnUtama = { padding: '12px 20px', background: AKSEN, color: '#fff', border: 0, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }
const btnKedua = { padding: '12px 20px', background: '#222b45', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }
const btnKecil = { padding: '8px 12px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', fontSize: 13 }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 8 }
const badge = { position: 'absolute', top: 6, left: 6, background: AKSEN, color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10 }

// Navigasi prev/next episode (tetangga terdekat yang ada linknya)
function NavEp({ embeds, ep, onPindah }) {
  const nos = [...new Set(embeds.map((e) => Number(e.ep)))].sort((a, b) => a - b)
  const i = nos.indexOf(Number(ep))
  const prev = i > 0 ? nos[i - 1] : null
  const next = i >= 0 && i < nos.length - 1 ? nos[i + 1] : null
  if (prev === null && next === null) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
      <button disabled={prev === null} onClick={() => onPindah(prev)} style={navBtn}>← E{prev ?? '–'}</button>
      <span style={{ color: '#888', fontSize: 13 }}>E{ep}</span>
      <button disabled={next === null} onClick={() => onPindah(next)} style={navBtn}>E{next ?? '–'} →</button>
    </div>
  )
}

const navBtn = { padding: '8px 14px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer' }
