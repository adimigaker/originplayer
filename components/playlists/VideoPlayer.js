'use client'

// VideoPlayer native gaya Jellyfin: overlay dalam frame, auto-hide,
// tap tengah putar/jeda, double-tap kiri/kanan ∓10 detik.
// Sumber: seeks HLS (token + hls.js), abyss MP4 (/abyssplay), URL langsung.
// autoPutar=false default: video tidak jalan sendiri (aturan browser + spek).
import { useState, useEffect, useRef } from 'react'
import Ikon from '@/components/playlists/Ikon'

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

export default function VideoPlayer({ embedUrl, title, tunnel, onPertamaPutar, autoPutar = false }) {
  const vRef = useRef(null)
  const stageRef = useRef(null)
  const hlsRef = useRef(null)
  const hideTimer = useRef(null)
  const lastTap = useRef({ side: '', t: 0 })
  const [status, setStatus] = useState('Siap.')
  const [jalan, setJalan] = useState(false)
  const [jeda, setJeda] = useState(true)
  const [waktu, setWaktu] = useState({ cur: 0, dur: 0 })
  const [kualitas, setKualitas] = useState([])
  const [qAktif, setQAktif] = useState(0)
  const [mode, setMode] = useState('')
  const [cfgBuka, setCfgBuka] = useState(false)
  const [ccNyala, setCcNyala] = useState(true)
  const [uiSembunyi, setUiSembunyi] = useState(false)
  const [flash, setFlash] = useState(null)
  const [kecepatan, setKecepatan] = useState(1)
  const pertama = useRef(false)
  const dataRef = useRef({ levels: [], proxy: '', meta: null, abyss: [] })
  const abSesi = useRef(0) // token pantau versi-penuh abyss (batalkan yg basi)

  const st = (m) => setStatus(m)
  const px = () => (tunnel ? tunnel.replace(/\/$/, '') + '/proxy?url=' : '/proxy?url=')
  const vid = () => vRef.current

  const hancurkanHls = () => {
    if (hlsRef.current) { try { hlsRef.current.destroy() } catch (e) {} hlsRef.current = null }
  }

  // ── overlay auto-hide ──
  const tampilUI = () => {
    setUiSembunyi(false)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      const v = vid()
      if (v && !v.paused) setUiSembunyi(true)
    }, 3000)
  }

  const putarJeda = () => {
    const v = vid()
    if (v) { v.paused ? v.play().catch(() => {}) : v.pause() }
  }

  const kilas = (sisi) => {
    setFlash(sisi)
    setTimeout(() => setFlash(null), 700)
  }

  // tap tengah = putar/jeda, double-tap kiri/kanan = ∓10 dtk
  const ketuk = (clientX) => {
    const stg = stageRef.current
    if (!stg) return
    const r = stg.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    const sisi = x < 0.32 ? 'L' : x > 0.68 ? 'R' : 'C'
    const now = Date.now()
    const lt = lastTap.current
    if (lt.side === sisi && now - lt.t < 320) {
      lastTap.current = { side: '', t: 0 }
      const v = vid()
      if (sisi === 'C') putarJeda()
      else if (v) {
        v.currentTime = Math.max(0, v.currentTime + (sisi === 'L' ? -10 : 10))
        kilas(sisi)
      }
      tampilUI()
      return
    }
    lastTap.current = { side: sisi, t: now }
    setTimeout(() => {
      const l2 = lastTap.current
      if (l2.side === sisi && Date.now() - l2.t >= 300) {
        lastTap.current = { side: '', t: 0 }
        setUiSembunyi((s) => {
          const v = vid()
          if (!s) return v && !v.paused ? true : s
          return false
        })
      }
    }, 330)
  }

  const fs = async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return }
      const el = stageRef.current || vid()
      if (el?.requestFullscreen) await el.requestFullscreen()
      else if (vid()?.webkitEnterFullscreen) vid().webkitEnterFullscreen()
      else st('Fullscreen tak didukung browser ini.')
    } catch (e) {
      st('Fullscreen ditolak: ' + e.message)
    }
  }

  const castRef = useRef({ siap: false, sesi: null })

  useEffect(() => {
    // Muat Chromecast Sender sekali (kayak cleanplayer)
    if (typeof window === 'undefined' || window.chrome?.cast) return
    window.__onGCastApiAvailable = (ok) => {
      if (!ok) return
      try {
        window.chrome.cast.initialize(
          new window.chrome.cast.ApiConfig(
            new window.chrome.cast.SessionRequest(window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID),
            (s) => { castRef.current.sesi = s },
            () => {},
            window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED),
          () => { castRef.current.siap = true },
          () => { castRef.current.siap = false })
      } catch (e) {}
    }
    const s = document.createElement('script')
    s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js'
    s.async = true
    document.head.appendChild(s)
  }, [])

  const urlCast = () => {
    const v = vid()
    const d = dataRef.current
    if (mode === 'seeks' && d.levels.length) {
      const lv = d.levels[qAktif] || d.levels[0]
      return d.proxy + encodeURIComponent(lv.url)
    }
    return v?.src || v?.currentSrc || ''
  }

  const keChromecast = (stream, judul) => new Promise((res, rej) => {
    try {
      const chrome = window.chrome
      if (!chrome?.cast || !castRef.current.siap) return rej(new Error('noapi'))
      const muat = (sess) => {
        castRef.current.sesi = sess
        const mi = new chrome.cast.media.MediaInfo(stream, 'application/x-mpegurl')
        mi.metadata = new chrome.cast.media.GenericMediaMetadata()
        mi.metadata.title = judul || 'OriginPlayer'
        sess.loadMedia(new chrome.cast.media.LoadRequest(mi), () => res('ok'), () => rej(new Error('load')))
      }
      if (castRef.current.sesi) return muat(castRef.current.sesi)
      chrome.cast.requestSession(muat, (e) => {
        if (e?.code === chrome.cast.ErrorCode.CANCEL) return rej({ byUser: true })
        rej(new Error('sess'))
      })
    } catch (e) { rej(e) }
  })

  const cast = async () => {
    const v = vid()
    try {
      if (v?.remote?.prompt) {
        await Promise.race([
          v.remote.prompt(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
        ])
        return
      }
    } catch (e) {}
    const stream = urlCast()
    if (!stream) { st('Putar video dulu sebelum cast.'); return }
    try {
      await keChromecast(stream, title)
      st('Casting ke TV...')
      return
    } catch (e) {
      if (e?.byUser) return
    }
    if (/Android/i.test(navigator.userAgent)) {
      location.href = 'intent://' + stream.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;type=video/*;package=org.videolan.vlc;S.browser_fallback_url=' +
        encodeURIComponent(stream) + ';end'
      st('Membuka VLC...')
      return
    }
    try { await navigator.clipboard.writeText(stream); st('Link streaming disalin — tempel di VLC / MX Player / TV.') }
    catch (e2) { prompt('Salin link streaming:', stream) }
  }

  const unduh = async () => {
    const v = vid()
    const d = dataRef.current
    // Mode seeks: ambil link MP4 asli via API download (kayak cleanplayer)
    if (mode === 'seeks' && d.meta && d.seeksId) {
      st('Menyiapkan link download...')
      try {
        const r = await fetch(`https://ps21.seeks.cloud/api/v1/download?id=${encodeURIComponent(d.seeksId)}&w=800&h=600&r=`)
        const hex = (await r.text()).trim()
        const data = new Uint8Array(hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16)))
        const te = new TextEncoder()
        const key = await crypto.subtle.importKey('raw', te.encode(SKEY), { name: 'AES-CBC' }, false, ['decrypt'])
        const pt = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: te.encode(SIV) }, key, data)
        const j = JSON.parse(new TextDecoder().decode(pt))
        if (!j.mp4) { st('Video ini tak ada file download.'); return }
        const url = d.proxy + encodeURIComponent(j.mp4)
        try { await navigator.clipboard.writeText(url) } catch (e) {}
        window.open(url, '_blank')
        st('Download dibuka di tab baru. Link disalin — pakai ADM bila gagal.')
      } catch (e) { st('Download gagal: ' + e.message) }
      return
    }
    // Abyss / langsung: unduh yang sedang diputar (link absolut + tersalin)
    const u = v?.src || v?.currentSrc
    if (u && u.startsWith('http')) {
      try { await navigator.clipboard.writeText(u) } catch (e) {}
      window.open(u, '_blank')
      st('Download dibuka di tab baru. Link disalin — pakai ADM bila gagal.')
    } else st('Putar video dulu sebelum download.')
  }

  const toggleCC = () => {
    const v = vid()
    if (!v) return
    let nyala = false
    for (const t of v.textTracks) if (t.mode === 'showing') nyala = true
    const next = nyala ? 'hidden' : 'showing'
    for (const t of v.textTracks) t.mode = next
    setCcNyala(!nyala)
  }

  // ── seeks: ambil + decrypt metadata ──
  const metaSeeks = async (id) => {
    const w = window.screen.width || 800
    const h = window.screen.height || 600
    const r = await fetch(`https://ps21.seeks.cloud/api/v1/video?id=${encodeURIComponent(id)}&w=${w}&h=${h}&r=`)
    if (!r.ok) throw new Error('seeks menolak (' + r.status + ')')
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

  const putarVarianSeeks = async (i, resume, paksa = false) => {
    const v = vid()
    const lv = dataRef.current.levels[i]
    if (!lv) return
    st(`Memuat ${lv.h}p...`)
    const rm = await fetch(lv.url)
    if (!rm.ok) throw new Error('varian mati (' + rm.status + ')')
    const txt = await rm.text()
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
        if (paksa || resume > 1 || autoPutar) v.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) st('Error: ' + data.details + ' — cek tunnel.')
      })
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = blobUrl
      if (autoPutar) v.play().catch(() => {})
    } else {
      st('Browser tidak mendukung HLS.')
    }
  }

  const mulaiSeeks = async (id) => {
    const v = vid()
    st('Minta token seeks...')
    const meta = await metaSeeks(id)
    const master = meta.cfNative || meta.source
    if (!master) { st('Tidak ada stream untuk ID ini.'); return }
    dataRef.current = { levels: [], proxy: px(), meta, abyss: [], seeksId: id }
    st('Token OK — memuat kualitas...')
    const rm = await fetch(master)
    if (!rm.ok) throw new Error('playlist mati (' + rm.status + ')')
    const masterTxt = await rm.text()
    const levels = pecahVarian(masterTxt, master)
    if (!levels.length) { st('Tidak ada varian kualitas.'); return }
    dataRef.current.levels = levels
    setKualitas(levels.map((l, i) => ({ label: `${l.h}p (${l.bw} kbps)`, i })))
    setMode('seeks')
    muatSubtitleSeeks(meta)
    await putarVarianSeeks(0, 0)
  }

  const muatSubtitleSeeks = async (meta) => {
    const v = vid()
    try {
      [...v.querySelectorAll('track')].forEach((t) => t.remove())
      const subs = meta.subtitle || {}
      const names = Object.keys(subs)
      if (!names.length) return
      const name = names[0]
      const subUrl = 'https://ps21.seeks.cloud' + String(subs[name]).split('#')[0]
      const rs = await fetch(px() + encodeURIComponent(subUrl))
      if (!rs.ok) return
      const txt = await rs.text()
      if (!txt.trim().startsWith('WEBVTT')) return
      const blobUrl = URL.createObjectURL(new Blob([txt], { type: 'text/vtt' }))
      const t = document.createElement('track')
      t.kind = 'subtitles'; t.label = name; t.srclang = 'id'; t.default = true
      const pasang = () => { v.removeEventListener('playing', pasang); v.appendChild(t); t.src = blobUrl; setCcNyala(true) }
      v.addEventListener('playing', pasang)
    } catch (e) {}
  }

  // ── abyss: via /abyss + /abyssplay tunnel ──
  const mulaiAbyss = async (raw) => {
    const v = vid()
    const m = String(raw).match(/abyssplayer\.com\/([A-Za-z0-9_-]{7,17})/)
    const slug = m ? m[1] : (String(raw).match(/[A-Za-z0-9_-]{7,17}/g) || []).pop() || ''
    if (!slug) { st('Slug abyss tidak ketemu.'); return }
    st('Minta link abyss...')
    const base = tunnel ? tunnel.replace(/\/$/, '') : ''
    const r = await fetch(`${base}/abyss?slug=${encodeURIComponent(slug)}`)
    if (!r.ok) throw new Error('backend abyss mati (' + r.status + ') — cek tunnel.')
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
    const top = daftar.find((s) => s.ok && /720p/.test(s.label)) || daftar.find((s) => s.ok)
    if (!top) { st('Abyss gagal: semua kualitas mati di server.'); return }
    setQAktif(daftar.indexOf(top))
    v.onerror = () => { st('Video error — coba kualitas lain.') }
    v.src = top.purl
    st(`OK — Abyss ${top.label}`)
    if (autoPutar) v.play().catch(() => {})
    // Versi penuh: VM rakit file statis sekali; pindah otomatis saat siap
    const qiTop = daftar.indexOf(top)
    const sesiAb = (abSesi.current += 1)
    try { fetch(`${base}/pdfile?ab=${encodeURIComponent(slug)}&q=${qiTop}&prepare=1`).catch(() => {}) } catch (e) {}
    const pantauAb = async () => {
      if (sesiAb !== abSesi.current) return
      try {
        const rr = await fetch(`${base}/pdfile?ab=${encodeURIComponent(slug)}&q=${qiTop}&stat=1`)
        const jj = await rr.json()
        if (sesiAb !== abSesi.current) return
        if (jj.ready) {
          const urlPenuh = `${base}/pdfile?ab=${encodeURIComponent(slug)}&q=${qiTop}`
          if (v.currentSrc === urlPenuh || v.src === urlPenuh) return
          const t = v.currentTime || 0, lagi = !v.paused
          const sekali = () => {
            v.removeEventListener('loadedmetadata', sekali)
            try { if (t > 1) v.currentTime = t } catch (e2) {}
            if (lagi || autoPutar) v.play().catch(() => {})
            st(`OK — versi penuh Abyss ${top.label} (seekbar natural).`)
          }
          v.addEventListener('loadedmetadata', sekali)
          v.src = urlPenuh
          st('Versi penuh siap — pindah (posisi aman)...')
          return
        }
      } catch (e) {}
      setTimeout(pantauAb, 8000)
    }
    setTimeout(pantauAb, 10000)
  }

  const mulaiLangsung = async (raw) => {
    const v = vid()
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
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPutar) v.play().catch(() => {})
          st('OK — HLS langsung.')
        })
      } else {
        v.src = raw
        if (autoPutar) v.play().catch(() => {})
      }
    } else {
      v.src = raw
      if (autoPutar) v.play().catch(() => {})
      st('OK — MP4 langsung.')
    }
  }

  useEffect(() => {
    const v = vid()
    if (!v || !embedUrl) return
    let hidup = true
    ;(async () => {
      await Promise.resolve()
      if (!hidup) return
      // Backend wajib buat seeks/abyss — jangan mulai sebelum tunnel siap,
      // kalau tidak fetch relatif kena 404 HTML (bacanya JSON → error DOCTYPE).
      const perluTunnel = /seeks\.cloud|abyssplayer\.com|abyss\.to/i.test(embedUrl)
      if (perluTunnel && !tunnel) { st('Menunggu tunnel...'); return }
      hancurkanHls()
      dataRef.current = { levels: [], proxy: '', meta: null, abyss: [] }
      setKualitas([])
      pertama.current = false
      await jalan()
    })()
    let gagal = false
    const jalan = async () => {
      try {
        if (/abyssplayer\.com|abyss\.to/i.test(embedUrl)) await mulaiAbyss(embedUrl)
        else if (/seeks\.cloud/i.test(embedUrl)) {
          const mm = String(embedUrl).match(/#([A-Za-z0-9]+)/)
          const id = mm ? mm[1] : String(embedUrl).trim()
          await mulaiSeeks(id)
        } else await mulaiLangsung(embedUrl)
      } catch (e) {
        gagal = true
        st('Gagal: ' + e.message)
      }
      if (!gagal && !autoPutar) st('Siap — ketuk tombol putar untuk mulai.')
    }
    const onPlay = () => {
      setJalan(true); setJeda(false); tampilUI()
      if (!pertama.current && onPertamaPutar) { pertama.current = true; onPertamaPutar() }
    }
    const onPause = () => { setJalan(false); setJeda(true); setUiSembunyi(false); if (hideTimer.current) clearTimeout(hideTimer.current) }
    const onTime = () => setWaktu({ cur: v.currentTime || 0, dur: v.duration || 0 })
    const onErr = () => st('Video error — coba kualitas lain.')
    const onSeek = () => tampilUI()
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onTime)
    v.addEventListener('error', onErr)
    v.addEventListener('seeking', onSeek)
    return () => {
      hidup = false
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onTime)
      v.removeEventListener('error', onErr)
      v.removeEventListener('seeking', onSeek)
      hancurkanHls()
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl, tunnel])

  const gantiKualitas = async (i) => {
    const v = vid()
    const d = dataRef.current
    setCfgBuka(false)
    if (mode === 'seeks' && d.levels.length) {
      await putarVarianSeeks(i, v.currentTime || 0, true)
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

  const gantiKecepatan = (spd) => {
    const v = vid()
    const n = parseFloat(spd)
    if (v) v.playbackRate = n
    setKecepatan(n)
    setCfgBuka(false)
  }

  return (
    <div>
      <style>{`.vp-stage:fullscreen,.vp-stage:-webkit-full-screen{width:100%!important;height:100%!important;display:flex!important;flex-direction:column!important;justify-content:center!important;background:#000!important;border-radius:0!important}.vp-stage:fullscreen video,.vp-stage:-webkit-full-screen video{max-height:100%!important}`}</style>
      <div
        ref={stageRef}
        className="vp-stage"
        onClick={(e) => { if (e.target.closest('button,select,input')) return; ketuk(e.clientX) }}
        style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', cursor: uiSembunyi ? 'none' : 'default' }}
      >
        <video ref={vRef} playsInline style={{ width: '100%', aspectRatio: '16/9', display: 'block', background: '#000' }} />

        {/* judul atas */}
        <div style={{ ...ovBar, top: 0, background: 'linear-gradient(rgba(0,0,0,.65),transparent)', opacity: uiSembunyi ? 0 : 1 }}>
          <span style={qBadge}>{kualitas[qAktif]?.label?.split(' ')[0] || '–'}</span>
          <button onClick={cast} style={tbtn} title="Cast ke TV"><span className="material-icons" style={{ fontSize: 28 }}>cast</span></button>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>{title}</span>
          <button onClick={toggleCC} style={{ ...tbtn, ...(ccNyala ? { color: AKSEN } : {}) }} title="Subtitle"><Ikon nama="cc" size={22} /></button>
          <button onClick={() => { setCfgBuka(!cfgBuka); tampilUI() }} style={tbtn} title="Setelan"><Ikon nama="setelan" size={22} /></button>
        </div>

        {/* tombol putar besar */}
        {jeda && (
          <div onClick={(e) => { e.stopPropagation(); putarJeda() }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(0,0,0,.25)', zIndex: 5 }}>
            <span style={bigBtn}><Ikon nama={jalan ? 'jeda' : 'putar'} size={40} /></span>
          </div>
        )}

        {/* kilatan ∓10 dtk */}
        {flash === 'L' && <span style={{ ...flashSt, left: 14 }}>−10 dtk</span>}
        {flash === 'R' && <span style={{ ...flashSt, right: 14 }}>+10 dtk</span>}

        {/* setelan: bottom sheet + sentuh luar = tutup */}
        {cfgBuka && (
          <>
            <div onClick={(e) => { e.stopPropagation(); setCfgBuka(false); tampilUI() }} style={sheetBg} />
            <div style={sheet} onClick={(e) => e.stopPropagation()}>
              <div style={sheetGrip} />
              <div style={sheetJudul}>Setelan</div>
              <div style={sheetLbl}>Kualitas</div>
              {kualitas.length > 1 ? (
                kualitas.map((k) => (
                  <button key={k.i} onClick={() => gantiKualitas(k.i)} style={k.i === qAktif ? optOn : opt}>
                    <span style={{ flex: 1, textAlign: 'left' }}>{k.label}</span>
                    {k.i === qAktif && <Ikon nama="cek" size={16} />}
                  </button>
                ))
              ) : (
                <div style={sheetKosong}>Otomatis</div>
              )}
              <div style={sheetLbl}>Kecepatan</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button key={s} onClick={() => gantiKecepatan(s)} style={s === kecepatan ? optOnFlex : optFlex}>{s}x</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* kontrol bawah */}
        <div style={{ ...ovBar, bottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: 4, background: 'linear-gradient(transparent,rgba(0,0,0,.75))', paddingBottom: 10, opacity: uiSembunyi ? 0 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={waktu_}>{fmt(waktu.cur)} / {fmt(waktu.dur)}</span>
            <span style={{ flex: 1 }} />
            <button onClick={unduh} style={tbtn} title="Download"><Ikon nama="unduh" size={22} /></button>
            <button onClick={fs} style={tbtn} title="Fullscreen"><Ikon nama="layar" size={22} /></button>
          </div>
          <input type="range" min={0} max={1000} value={waktu.dur ? Math.round((waktu.cur / waktu.dur) * 1000) : 0}
            onChange={(e) => { const v = vid(); if (v && v.duration) v.currentTime = (e.target.value / 1000) * v.duration }}
            style={{ width: '100%', accentColor: AKSEN, margin: 0 }} />
        </div>
      </div>
      <p style={{ color: AKSEN, fontSize: 13, minHeight: 18 }}>{status}</p>
    </div>
  )
}

const ovBar = { position: 'absolute', left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', zIndex: 4, transition: 'opacity .3s', pointerEvents: 'auto' }
const tbtn = { background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', borderRadius: '50%', padding: 6, lineHeight: 1 }
const qBadge = { fontSize: 14, fontWeight: 'bold', color: '#fff' }
const waktu_ = { fontSize: 12, color: '#eee', whiteSpace: 'nowrap' }
const bigBtn = { width: 76, height: 76, borderRadius: '50%', background: 'rgba(20,20,20,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const flashSt = { position: 'absolute', top: '38%', fontSize: 15, fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '8px 14px', borderRadius: 20, zIndex: 5 }
const sheetBg = { position: 'absolute', inset: 0, zIndex: 6 }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, background: '#161624', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '8px 16px 20px', zIndex: 7 }
const sheetGrip = { width: 40, height: 4, borderRadius: 2, background: '#444', margin: '4px auto 10px' }
const sheetJudul = { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 4 }
const sheetLbl = { fontSize: 12, color: '#888', marginTop: 10, marginBottom: 6 }
const sheetKosong = { fontSize: 13, color: '#888' }
const opt = { display: 'flex', alignItems: 'center', width: '100%', background: 'transparent', color: '#eee', border: '1px solid #333d5c', borderRadius: 8, padding: '10px 12px', fontSize: 14, cursor: 'pointer', marginBottom: 6 }
const optOn = { ...opt, borderColor: AKSEN, color: AKSEN }
const optFlex = { flex: 1, background: 'transparent', color: '#eee', border: '1px solid #333d5c', borderRadius: 8, padding: '8px 0', fontSize: 14, cursor: 'pointer' }
const optOnFlex = { ...optFlex, borderColor: AKSEN, color: AKSEN, fontWeight: 'bold' }
