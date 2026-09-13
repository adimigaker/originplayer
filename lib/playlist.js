// Helper playlist mode: validasi kode, hash PIN, base tunnel cleanplayer.
export const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/
export const UMUM = ['film', 'movie', 'test', 'test123', 'admin', 'playlist', '1234', 'abcd']

export function kodeOke(code) {
  return CODE_RE.test(String(code || ''))
}

export function kodeTerlaluUmum(code) {
  return UMUM.includes(String(code || '').toLowerCase())
}

export function slugify(teks) {
  const s = String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'tanpa-judul'
}

// SHA-256 hex via WebCrypto (PIN tidak pernah dikirim polos)
export async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

let _tunnel = null

// Base tunnel dibaca dari proxy-url.txt statis (auto-update supervisor)
export async function tunnelBase() {
  if (_tunnel) return _tunnel
  try {
    const r = await fetch('https://adimigaker.github.io/cleanplayer/proxy-url.txt')
    const t = (await r.text()).trim()
    if (t.startsWith('http')) {
      _tunnel = t.split('/proxy')[0]
      return _tunnel
    }
  } catch {}
  return ''
}

// Lanjut-nonton per kode, per item, per episode (localStorage)
export function simpanProgress(code, itemId, ep, detik, durasi) {
  try {
    const k = 'ps_prog_' + code
    const semua = JSON.parse(localStorage.getItem(k) || '{}')
    semua[itemId + ':' + ep] = { detik, durasi, at: Date.now() }
    localStorage.setItem(k, JSON.stringify(semua))
  } catch {}
}

export function bacaProgress(code) {
  try {
    return JSON.parse(localStorage.getItem('ps_prog_' + code) || '{}')
  } catch (e) {
    return {}
  }
}
