'use client'

import { useState, useEffect } from 'react'

// Cara pakai: import { toast } from '@/components/Toast' lalu toast.error('pesan')
// atau toast.success('pesan'). Tanpa perlu state lokal.
let listeners = []
export const toast = {
  push(t) { listeners.forEach((fn) => fn(t)) },
  success(msg) { toast.push({ kind: 'ok', msg }) },
  error(msg) { toast.push({ kind: 'err', msg }) },
  info(msg) { toast.push({ kind: 'info', msg }) },
}

export default function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const on = (t) => {
      const id = Date.now() + Math.random()
      setItems((xs) => [...xs, { ...t, id }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 6000)
    }
    listeners.push(on)
    return () => { listeners = listeners.filter((l) => l !== on) }
  }, [])

  if (!items.length) return null
  return (
    <div className="fixed top-4 right-4 z-[999] flex flex-col gap-2 max-w-[92vw] sm:max-w-md pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md animate-[toastIn_.25s_ease] ${
            t.kind === 'ok'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : t.kind === 'err'
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : 'bg-slate-900/90 border-white/10 text-slate-200'
          }`}
        >
          <span className="material-icons text-[18px] mt-0.5 shrink-0">
            {t.kind === 'ok' ? 'check_circle' : t.kind === 'err' ? 'error' : 'info'}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">
              {t.kind === 'ok' ? 'Berhasil' : t.kind === 'err' ? 'Gagal' : 'Info'}
            </p>
            <p className="text-[12px] leading-snug break-words opacity-90 mt-0.5">{t.msg}</p>
          </div>
        </div>
      ))}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
