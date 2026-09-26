import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('op_episodes')
    .select('*, op_streams(*)')
    .eq('title_id', id)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true })
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request, { params }) {
  const { id: title_id } = await params
  try {
    const body = await request.json()
    const { season_number, episode_number, stream_url, server_name } = body

    // 1. Upsert Episode
    const { data: ep, error: epErr } = await supabase
      .from('op_episodes')
      .upsert({ title_id, season_number, episode_number }, { onConflict: 'title_id,season_number,episode_number' })
      .select()
      .single()
    
    if (epErr) throw epErr

    // 2. Add/Update Stream for this episode
    const { error: stErr } = await supabase
      .from('op_streams')
      .upsert({ 
        episode_id: ep.id, 
        stream_url, 
        server_name: server_name || 'Abyss Utama' 
      }, { onConflict: 'episode_id,server_name' }) // Perlu index unique di DB jika ingin onConflict server_name

    if (stErr) throw stErr

    return Response.json({ success: true, episode: ep })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
