import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import DetailRoute from '@/components/playlists/DetailRoute'

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/

export async function generateMetadata({ params }) {
  const { code, show } = await params
  return { title: `${show} - Playlist ${code}` }
}

// Halaman 1 tayangan: /p/KODE/slug-judul (tanpa autoplay)
export default async function ShowPage({ params }) {
  const { code, show } = await params

  if (!CODE_RE.test(code)) notFound()

  const { data: pl } = await supabase
    .from('ps_playlists')
    .select('code, pin_hash')
    .eq('code', code)
    .single()

  if (!pl) notFound()

  const { data: item } = await supabase
    .from('ps_playlist_items')
    .select('*')
    .eq('playlist_code', code)
    .eq('slug', show)
    .single()

  if (!item) notFound()

  return <DetailRoute code={pl.code} hasPinServer={!!pl.pin_hash} item={item} />
}
