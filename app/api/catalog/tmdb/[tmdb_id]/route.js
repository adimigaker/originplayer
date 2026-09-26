import { supabase } from '@/lib/supabaseClient'

export async function GET(request, { params }) {
  const { tmdb_id } = await params
  const { data, error } = await supabase
    .from('op_titles')
    .select('*')
    .eq('tmdb_id', tmdb_id)
    .single()
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
