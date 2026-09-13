'use client'

import { useState, useEffect, useCallback } from 'react'
import { sha256hex, bacaProgress, slugify } from '@/lib/playlist'
import ItemForm from '@/components/playlists/ItemForm'
import Ikon from '@/components/playlists/Ikon'

const BG = '#0b0f1a'
const CARD = '#141b2e'
const AKSEN = '#00a4dc'

export default function PlaylistApp({ code, has_pin }) {
  const [terkunci, setTerkunci] = useState(has_pin)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [items, setItems] = useState(null)
  const [form, setForm] = useState(null) // null | { type, item? }
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

  const hapusItem = async (item) => {
    if (!confirm(`Hapus "${item.title}" dari playlist?`)) return
    const p = sessionStorage.getItem('ps_pin_' + code) || ''
    await fetch(`/api/playlists/items?id=${item.id}&code=${encodeURIComponent(code)}&pin=${p}`, { method: 'DELETE' })
    muat()
  }

  if (terkunci) {
    return (
      <div style={tengah}>
        <form onSubmit={bukaKunci} style={{ ...CARD_, width: '100%', maxWidth: 360 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Ikon nama="kunci" /> {code}</h3>
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
        <a href="/playlists" style={{ color: AKSEN, textDecoration: 'none', display: 'inline-flex' }} title="Beranda"><Ikon nama="kembali" size={20} /></a>
        <b style={{ fontSize: 18 }}>{code}</b>
        <span style={{ flex: 1 }} />
        <button onClick={aturPin} style={btnIkon}><Ikon nama="kunci" size={14} /> PIN</button>
        <button onClick={() => setForm({ type: 'movie' })} style={btnIkon}><Ikon nama="plus" size={14} /> Film</button>
        <button onClick={() => setForm({ type: 'series' })} style={btnIkon}><Ikon nama="plus" size={14} /> Series</button>
      </header>

      <span id="pinState" data-on={has_pin ? '1' : '0'} style={{ display: 'none' }} />

      {form && (
        <ItemForm
          code={code}
          type={form.type}
          awal={form.item || null}
          onTutup={() => setForm(null)}
          onSimpan={() => { setForm(null); muat() }}
        />
      )}

      {items === null && <p style={{ padding: 24, color: '#888' }}>Memuat...</p>}

      {items !== null && (
        <main style={{ padding: '4px 20px 40px', maxWidth: 1100, margin: 'auto' }}>
          {kunci ? (
            <div style={{ ...CARD_, textAlign: 'center', padding: 40, marginTop: 30 }}>
              <div style={{ color: AKSEN }}><Ikon nama="film" size={48} /></div>
              <h2>Playlist masih kosong</h2>
              <p style={{ color: '#888' }}>Tambahkan film atau series pertama ke library-mu.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setForm({ type: 'movie' })} style={btnUtama}>+ Tambah Film</button>
                <button onClick={() => setForm({ type: 'series' })} style={btnKedua}>+ Tambah Series</button>
              </div>
            </div>
          ) : (
            <>
              <Rak code={code} ikon="film" judul="Film" isi={film} prog={prog}
                onEdit={(item) => setForm({ type: item.type, item })} onHapus={hapusItem} />
              <Rak code={code} ikon="tv" judul="Series" isi={series} prog={prog}
                onEdit={(item) => setForm({ type: item.type, item })} onHapus={hapusItem} />
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

function Rak({ code, ikon, judul, isi, prog, onEdit, onHapus }) {
  if (!isi.length) return null
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Ikon nama={ikon} size={18} /> {judul} <span style={{ color: '#666', fontSize: 13 }}>{isi.length}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
        {isi.map((it) => {
          const slug = it.slug || slugify(it.title)
          const eps = (it.embeds || []).map((e) => e.ep)
          const lanjut = eps.some((ep) => prog[it.id + ':' + ep])
          return (
            <div key={it.id} style={{ position: 'relative' }}>
              <a href={`/p/${code}/${slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ position: 'relative', aspectRatio: '2/3', background: '#222b45', borderRadius: 8, overflow: 'hidden' }}>
                  {it.poster && <img src={it.poster} alt={it.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {lanjut && <span style={badge}>Lanjut</span>}
                </div>
                <div style={{ fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{it.year || ''}{it.rating ? ` ★ ${it.rating}` : ''}</div>
              </a>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={() => onEdit(it)} style={miniBtn} title="Edit"><Ikon nama="edit" size={13} /></button>
                <button onClick={() => onHapus(it)} style={{ ...miniBtn, color: '#ff6b6b' }} title="Hapus"><Ikon nama="hapus" size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Bagikan({ code }) {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== 'undefined' ? window.location.origin + '/p/' + code : '/p/' + code
  return (
    <span style={{ color: '#888', fontSize: 13 }}>
      <Ikon nama="tautan" size={14} /> Link share: <code style={{ color: '#bbb' }}>{link}</code>{' '}
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
const btnIkon = { padding: '8px 12px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }
const miniBtn = { padding: '6px 8px', background: '#222b45', color: '#fff', border: '1px solid #333d5c', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'inline-flex' }
const input = { width: '100%', padding: 12, fontSize: 16, background: '#0b0f1a', color: '#fff', border: '1px solid #333d5c', borderRadius: 8, boxSizing: 'border-box', marginTop: 8 }
const badge = { position: 'absolute', top: 6, left: 6, background: AKSEN, color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10 }
