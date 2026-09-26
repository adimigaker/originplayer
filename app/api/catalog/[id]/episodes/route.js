import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('op_episodes')
    .select('*')
    .eq('title_id', id)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (data || []).map((e) => e.id)
  let streams = []
  if (ids.length) {
    const r = await supabase.from('op_streams').select('*').in('episode_id', ids).order('priority', { ascending: true })
    streams = r.data || []
  }
  return Response.json((data || []).map((e) => ({ ...e, streams: streams.filter((s) => s.episode_id === e.id) })))
}

export async function POST(request, { params }) {
  const { id: titleId } = await params
  try {
    const b = await request.json()
    const { season_number, episode_number, episode_title, still_path, overview } = b

    const { data: ep, error } = await supabase
      .from('op_episodes')
      .upsert(
        { title_id: titleId, season_number, episode_number, episode_title: episode_title || null, still_path: still_path || null, overview: overview || null },
        { onConflict: 'title_id,season_number,episode_number' },
      )
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(ep)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
