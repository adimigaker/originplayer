import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('op_titles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { tmdb_id, type, title, slug, poster, backdrop, synopsis, year, rating, genres } = body

    const { data, error } = await supabase
      .from('op_titles')
      .upsert({ tmdb_id, type, title, slug, poster, backdrop, synopsis, year, rating, genres }, { onConflict: 'tmdb_id' })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
