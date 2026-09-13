import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import WatchClient from '@/components/playlists/WatchClient'

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/

export async function generateMetadata({ params }) {
  const { code, show } = await params
  return { title: `Nonton ${show} - Playlist ${code}` }
}

// Shortcut langsung: /p/KODE/slug-judul/EP
export default async function WatchPage({ params }) {
  const { code, show, ep } = await params

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

  const epNum = parseInt(ep) || 1
  const embeds = item.embeds || []
  const ada = embeds.some((e) => Number(e.ep) === epNum)
  if (item.type === 'series' && embeds.length && !ada) notFound()

  return (
    <WatchClient
      code={pl.code}
      hasPinServer={!!pl.pin_hash}
      item={item}
      epAwal={item.type === 'series' ? epNum : 1}
    />
  )
}
