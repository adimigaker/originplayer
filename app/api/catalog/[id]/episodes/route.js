import { supabase } from '@/lib/supabaseClient'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { id: tmdbId } = await params
  try {
    const { data: title } = await supabase
      .from('op_titles')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .single()

    if (!title) return NextResponse.json([])

    const { data: eps } = await supabase
      .from('op_episodes')
      .select('*')
      .eq('title_id', title.id)
      .order('season_number', { ascending: true })
      .order('episode_number', { ascending: true })

    return NextResponse.json(eps || [])
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
