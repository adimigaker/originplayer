import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import PlaylistApp from '@/components/playlists/PlaylistApp'

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/

export async function generateMetadata({ params }) {
  const { code } = await params
  return { title: `Playlist ${code} - Pirate Studio 21` }
}

export default async function PlaylistPage({ params, searchParams }) {
  const { code } = await params
  const sp = searchParams ? await searchParams : {}
  const klaimBaru = sp.baru === '1'

  if (!CODE_RE.test(code)) notFound()

  // Mode buat: kode belum boleh dipakai
  if (klaimBaru) {
    const { data: ada } = await supabase
      .from('ps_playlists')
      .select('code')
      .eq('code', code)
      .single()

    if (ada) {
      return (
        <Pesan judul="Kode sudah dipakai" isi="Kode ini sudah ada yang punya. Kembali dan pilih kode lain ya." />
      )
    }

    // Daftarkan langsung (tanpa PIN dulu, bisa dikunci dari dashboard)
    const { error } = await supabase.from('ps_playlists').insert({ code })
    if (error) {
      return <Pesan judul="Gagal membuat" isi={error.message} />
    }
    return <PlaylistApp code={code} has_pin={false} />
  }

  // Mode muat: harus ada
  const { data: row } = await supabase
    .from('ps_playlists')
    .select('code, pin_hash')
    .eq('code', code)
    .single()

  if (!row) notFound()

  return <PlaylistApp code={row.code} has_pin={!!row.pin_hash} />
}

function Pesan({ judul, isi }) {
  return (
    <div style={{ background: '#0b0f1a', minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <div>
        <h2>{judul}</h2>
        <p style={{ color: '#888' }}>{isi}</p>
        <a href="/playlists" style={{ color: '#00a4dc' }}>← Kembali</a>
      </div>
    </div>
  )
}
