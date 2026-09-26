import { supabase } from '@/lib/supabaseClient'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/catalog/[id]/watch?s=1&e=1&type=series
// Membantu halaman player mendapatkan stream yang sudah di-order berdasarkan priority
export async function GET(request, { params }) {
  const { id: tmdbId } = await params
  const { searchParams } = new URL(request.url)
  const s = searchParams.get('s')
  const e = searchParams.get('e')
  const type = searchParams.get('type') // 'movie' atau 'series'

  try {
    // 1. Cari title_id dari tmdb_id
    const { data: title, error: tErr } = await supabase
      .from('op_titles')
      .select('id, type')
      .eq('tmdb_id', tmdbId)
      .single()

    if (tErr || !title) return NextResponse.json({ error: 'Judul tidak ada di katalog' }, { status: 404 })

    let streams = []

    if (type === 'movie' || title.type === 'movie') {
      // Ambil stream movie langsung dari title_id
      const { data } = await supabase
        .from('op_streams')
        .select('*')
        .eq('title_id', title.id)
        .is('episode_id', null)
        .eq('is_active', true)
        .order('priority', { ascending: true })
      streams = data || []
    } else {
      // Ambil stream series berdasarkan episode
      if (!s || !e) return NextResponse.json({ error: 'Season & Episode wajib untuk series' }, { status: 400 })

      // Cari episode_id
      const { data: ep, error: eErr } = await supabase
        .from('op_episodes')
        .select('id')
        .eq('title_id', title.id)
        .eq('season_number', parseInt(s))
        .eq('episode_number', parseInt(e))
        .single()

      if (eErr || !ep) return NextResponse.json({ error: 'Episode belum terdaftar' }, { status: 404 })

      const { data } = await supabase
        .from('op_streams')
        .select('*')
        .eq('episode_id', ep.id)
        .eq('is_active', true)
        .order('priority', { ascending: true })
      streams = data || []
    }

    return NextResponse.json({ streams })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
