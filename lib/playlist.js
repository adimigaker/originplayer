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

// Cloudflare Worker = proxy utama (stream abyss + seeks), proxy VM = fallback
// otomatis kalau worker error / habis kuota 100GB/bulan.
export const WORKER_BASE = 'https://originproxy.melted-slayer-900.workers.dev'

export async function tunnelBase() {
  if (_tunnel) return _tunnel
  _tunnel = WORKER_BASE
  return _tunnel
}

let _bases = null

// Urutan base proxy: Worker (utama) → proxy VM via tunnel duckdns (fallback).
// Semua https aman dipakai dari halaman https (tanpa mixed-content block).
export async function proxyBases() {
  if (_bases) return _bases
  const b = [WORKER_BASE]
  try {
    const r = await fetch('https://adimigaker.github.io/cleanplayer/proxy-url.txt')
    const t = (await r.text()).trim()
    if (t.startsWith('http')) {
      const vm = t.split('/proxy')[0]
      if (!b.includes(vm)) b.push(vm)
    }
  } catch {}
  _bases = { bases: b }
  return _bases
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

export function hapusProgress(code, itemId, ep) {
  try {
    const k = 'ps_prog_' + code
    const semua = JSON.parse(localStorage.getItem(k) || '{}')
    delete semua[itemId + ':' + ep]
    localStorage.setItem(k, JSON.stringify(semua))
  } catch (e) {}
}
