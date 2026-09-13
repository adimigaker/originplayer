'use client'

// VideoPlayer native: <video> langsung di halaman (tanpa iframe).
// Mendukung seeks HLS (token + hls.js), abyss MP4 (rakitan /abyssplay),
// dan URL MP4/HLS langsung. Backend = tunnel cleanplayer (proxy + /abyss).
import { useState, useEffect, useRef } from 'react'

const AKSEN = '#00a4dc'
const SKEY = 'kiemtienmua911ca'
const SIV = '1234567890oiuytr'

let hlsSiap = null
function muatHls() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Hls) return Promise.resolve(window.Hls)
  if (!hlsSiap) {
    hlsSiap = new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js'
      s.onload = () => res(window.Hls)
      s.onerror = () => rej(new Error('hls.js gagal dimuat'))
      document.head.appendChild(s)
    })
  }
  return hlsSiap
}

const fmt = (detik) => {
  if (!isFinite(detik) || detik < 0) return '0:00'
  detik = Math.floor(detik)
  return Math.floor(detik / 60) + ':' + String(detik % 60).padStart(2, '0')
}

export default function VideoPlayer({ embedUrl, title, tunnel, onPertamaPutar }) {
  const vRef = useRef(null)
  const hlsRef = useRef(null)
  const [status, setStatus] = useState('Siap.')
  const [jalan, setJalan] = useState(false)
  const [waktu, setWaktu] = useState({ cur: 0, dur: 0 })
  const [kualitas, setKualitas] = useState([])
  const [qAktif, setQAktif] = useState(0)
  const [mode, setMode] = useState('')
  const pertama = useRef(false)
  const dataRef = useRef({ levels: [], proxy: '', meta: null, abyss: [] })

  const st = (m) => setStatus(m)
  const px = () => (tunnel ? tunnel.replace(/\/$/, '') + '/proxy?url=' : '/proxy?url=')

  const hancurkanHls = () => {
    if (hlsRef.current) { try { hlsRef.current.destroy() } catch (e) {} hlsRef.current = null }
  }

  // ── seeks: ambil + decrypt metadata ──
  const metaSeeks = async (id) => {
    const w = window.screen.width || 800
    const h = window.screen.height || 600
    const r = await fetch(`https://ps21.seeks.cloud/api/v1/video?id=${encodeURIComponent(id)}&w=${w}&h=${h}&r=`)
    const hex = (await r.text()).trim()
    const data = new Uint8Array(hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16)))
    const te = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', te.encode(SKEY), { name: 'AES-CBC' }, false, ['decrypt'])
    const pt = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: te.encode(SIV) }, key, data)
    return JSON.parse(new TextDecoder().decode(pt))
  }

  const pecahVarian = (masterTxt, masterUrl) => {
    const levels = []
    const lines = masterTxt.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].trim().match(/#EXT-X-STREAM-INF:(.*)/)
      if (m) {
        const bw = (m[1].match(/BANDWIDTH=(\d+)/) || [])[1] || '?'
        const res = (m[1].match(/RESOLUTION=(\d+x\d+)/) || [])[1] || ''
        const hh = (res.match(/x(\d+)/) || [])[1] || '?'
        const uri = (lines[i + 1] || '').trim()
        if (uri && !uri.startsWith('#')) levels.push({ h: hh, bw: Math.round(bw / 1000), url: new URL(uri, masterUrl).href })
      }
    }
    return levels
  }

  const tulisUlangSegmen = (varTxt, varUrl) => {
    const p = px()
    return varTxt.split('\n').map((line) => {
      const s = line.trim()
      const m = s.match(/^(.*URI=")([^"]+)(".*)$/)
      if (m) return m[1] + p + encodeURIComponent(new URL(m[2], varUrl).href) + m[3]
      if (s && !s.startsWith('#')) return p + encodeURIComponent(new URL(s, varUrl).href)
      return line
    }).join('\n')
  }

  const putarVarianSeeks = async (i, resume) => {
    const v = vRef.current
    const lv = dataRef.current.levels[i]
    if (!lv) return
    st(`Memuat ${lv.h}p...`)
    const txt = await (await fetch(lv.url)).text()
    const blobUrl = URL.createObjectURL(new Blob(
      [tulisUlangSegmen(txt, lv.url)], { type: 'application/vnd.apple.mpegurl' }))
    hancurkanHls()
    setQAktif(i)
    const Hls = await muatHls()
    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(blobUrl)
      hls.attachMedia(v)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        st('OK — ' + lv.h + 'P')
        if (resume > 1) { try { v.currentTime = resume } catch (e) {} }
        v.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) st('Error: ' + data.details + ' — cek tunnel.')
      })
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = blobUrl
      v.play().catch(() => {})
    } else {
      st('Browser tidak mendukung HLS.')
    }
  }

  const mulaiSeeks = async (id) => {
    const v = vRef.current
    st('Minta token seeks...')
    const meta = await metaSeeks(id)
    const master = meta.cfNative || meta.source
    if (!master) { st('Tidak ada stream untuk ID ini.'); return }
    dataRef.current = { levels: [], proxy: px(), meta, abyss: [] }
    st('Token OK — memuat kualitas...')
    const masterTxt = await (await fetch(master)).text()
    const levels = pecahVarian(masterTxt, master)
    if (!levels.length) { st('Tidak ada varian kualitas.'); return }
    dataRef.current.levels = levels
    setKualitas(levels.map((l, i) => ({ label: `${l.h}p (${l.bw} kbps)`, i })))
    setMode('seeks')
    muatSubtitleSeeks(meta)
    await putarVarianSeeks(0, 0)
  }

  const muatSubtitleSeeks = async (meta) => {
    const v = vRef.current
    try {
      [...v.querySelectorAll('track')].forEach((t) => t.remove())
      const subs = meta.subtitle || {}
      const names = Object.keys(subs)
      if (!names.length) return
      const name = names[0]
      const subUrl = 'https://ps21.seeks.cloud' + String(subs[name]).split('#')[0]
      const txt = await (await fetch(px() + encodeURIComponent(subUrl))).text()
      if (!txt.trim().startsWith('WEBVTT')) return
      const blobUrl = URL.createObjectURL(new Blob([txt], { type: 'text/vtt' }))
      const t = document.createElement('track')
      t.kind = 'subtitles'; t.label = name; t.srclang = 'id'; t.default = true
      const pasang = () => { v.removeEventListener('playing', pasang); v.appendChild(t); t.src = blobUrl }
      v.addEventListener('playing', pasang)
    } catch (e) {}
  }

  // ── abyss: via /abyss + /abyssplay tunnel ──
  const mulaiAbyss = async (raw) => {
    const v = vRef.current
    let m = String(raw).match(/abyssplayer\.com\/([A-Za-z0-9_-]{7,17})/)
    const slug = m ? m[1] : (String(raw).match(/[A-Za-z0-9_-]{7,17}/g) || []).pop() || ''
    if (!slug) { st('Slug abyss tidak ketemu.'); return }
    st('Minta link abyss...')
    const base = tunnel ? tunnel.replace(/\/$/, '') : ''
    const r = await fetch(`${base}/abyss?slug=${encodeURIComponent(slug)}`)
    const data = await r.json()
    if (!data.sources?.length) { st('Abyss gagal: ' + (data.error || 'tanpa sources')); return }
    const daftar = data.sources.map((s, qi) => ({
      label: `${s.label} (${(s.size / 1073741824).toFixed(1)} GB)`,
      qi, size: s.size,
      purl: `${base}/abyssplay?slug=${encodeURIComponent(slug)}&q=${qi}`,
      ok: true,
    }))
    st('Cek kualitas...')
    for (const s of daftar) {
      try {
        const pr = await fetch(s.purl, { headers: { Range: 'bytes=0-0' } })
        s.ok = pr.status === 206 || pr.ok
      } catch (e) { s.ok = false }
    }
    dataRef.current = { levels: [], proxy: '', meta: null, abyss: daftar }
    setKualitas(daftar.map((s, i) => ({ label: s.label + (s.ok ? '' : ' — mati'), i })))
    setMode('abyss')
    const top = daftar.find((s) => s.ok)
    if (!top) { st('Abyss gagal: semua kualitas mati di server.'); return }
    setQAktif(daftar.indexOf(top))
    v.src = top.purl
    st(`OK — Abyss ${top.label}`)
    v.play().catch(() => {})
  }

  const mulaiLangsung = async (raw) => {
    const v = vRef.current
    hancurkanHls()
    setKualitas([])
    setMode('langsung')
    if (/\.m3u8(\?|$)/i.test(raw)) {
      const Hls = await muatHls()
      if (Hls.isSupported()) {
        const hls = new Hls()
        hlsRef.current = hls
        hls.loadSource(raw)
        hls.attachMedia(v)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); st('OK — HLS langsung.') })
      } else {
        v.src = raw
        v.play().catch(() => {})
      }
    } else {
      v.src = raw
      v.play().catch(() => {})
      st('OK — MP4 langsung.')
    }
  }

  useEffect(() => {
    const v = vRef.current
    if (!v || !embedUrl) return
    hancurkanHls()
    dataRef.current = { levels: [], proxy: '', meta: null, abyss: [] }
    setKualitas([])
    pertama.current = false
    const jalan = async () => {
      try {
        if (/abyssplayer\.com|abyss\.to/i.test(embedUrl)) await mulaiAbyss(embedUrl)
        else if (/seeks\.cloud/i.test(embedUrl)) {
          const mm = String(embedUrl).match(/#([A-Za-z0-9]+)/)
          const id = mm ? mm[1] : String(embedUrl).trim()
          await mulaiSeeks(id)
        } else await mulaiLangsung(embedUrl)
      } catch (e) {
        st('Gagal: ' + e.message)
      }
    }
    jalan()
    const onPlay = () => {
      setJalan(true)
      if (!pertama.current && onPertamaPutar) { pertama.current = true; onPertamaPutar() }
    }
    const onPause = () => setJalan(false)
    const onTime = () => setWaktu({ cur: v.currentTime || 0, dur: v.duration || 0 })
    const onErr = () => st('Video error — coba kualitas lain.')
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onTime)
    v.addEventListener('error', onErr)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onTime)
      v.removeEventListener('error', onErr)
      hancurkanHls()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl])

  const gantiKualitas = async (i) => {
    const v = vRef.current
    const d = dataRef.current
    if (mode === 'seeks' && d.levels.length) {
      await putarVarianSeeks(i, v.currentTime || 0)
    } else if (mode === 'abyss' && d.abyss.length) {
      const s = d.abyss[i]
      if (!s?.ok) { st('Kualitas itu mati di server.'); return }
      const pos = v.currentTime || 0
      setQAktif(i)
      v.src = s.purl
      v.play().then(() => { if (pos > 1) { try { v.currentTime = pos } catch (e) {} } }).catch(() => {})
      st('Abyss ' + s.label)
    }
  }

  const v = vRef.current
  const toggle = () => { if (v) { v.paused ? v.play().catch(() => {}) : v.pause() } }
  const fs = () => {
    const stg = v?.parentElement
    if (document.fullscreenElement) document.exitFullscreen()
    else if (stg?.requestFullscreen) stg.requestFullscreen()
  }

  return (
    <div>
      <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        <video ref={vRef} playsInline controls={false} onClick={toggle}
          style={{ width: '100%', aspectRatio: '16/9', display: 'block', background: '#000' }} />
        <div style={bar}>
          <button onClick={toggle} style={tbtn}>{jalan ? '⏸' : '▶'}</button>
          <span style={waktu_}>{fmt(waktu.cur)} / {fmt(waktu.dur)}</span>
          <input type="range" min={0} max={waktu.dur || 0} step={1} value={waktu.cur}
            onChange={(e) => { if (v && v.duration) v.currentTime = parseFloat(e.target.value) }}
            style={{ flex: 1, accentColor: AKSEN }} />
          {kualitas.length > 1 && (
            <select value={qAktif} onChange={(e) => gantiKualitas(parseInt(e.target.value))} style={sel}>
              {kualitas.map((k) => <option key={k.i} value={k.i}>{k.label}</option>)}
            </select>
          )}
          <select onChange={(e) => { if (v) v.playbackRate = parseFloat(e.target.value) }} defaultValue="1" style={sel}>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          <button onClick={fs} style={tbtn} title="Fullscreen">⛶</button>
        </div>
      </div>
      <p style={{ color: AKSEN, fontSize: 13, minHeight: 18 }}>{status}</p>
    </div>
  )
}

const bar = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(10,10,18,.95)' }
const tbtn = { background: 'transparent', border: 0, color: '#fff', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }
const waktu_ = { fontSize: 12, color: '#ddd', whiteSpace: 'nowrap' }
const sel = { background: '#1a1a24', color: '#eee', border: '1px solid #444', borderRadius: 6, padding: 6, fontSize: 12 }
