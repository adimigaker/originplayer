import { supabase } from '@/lib/supabaseClient'

export async function DELETE(request, { params }) {
  const { id } = await params
  const { error } = await supabase.from('op_titles').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
