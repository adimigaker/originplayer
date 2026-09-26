import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

// GET /api/catalog/[id]/streams -> semua stream untuk title (atau episode tertentu)
export async function GET(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const epId = searchParams.get('episode_id')

  let q = supabase.from('op_streams').select('*').eq('title_id', id).order('priority', { ascending: true })
  if (epId) q = q.eq('episode_id', epId)
  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// POST: tambah server baru (movie) atau server untuk episode tertentu
export async function POST(request, { params }) {
  const { id: titleId } = await params
  try {
    const b = await request.json()
    const payload = {
      title_id: titleId,
      episode_id: b.episode_id || null,
      server_name: b.server_name || 'Abyss Utama',
      stream_url: b.stream_url,
      priority: b.priority || 1,
      is_active: true,
    }
    if (!payload.stream_url) return Response.json({ error: 'stream_url wajib diisi.' }, { status: 400 })

    const { data, error } = await supabase.from('op_streams').insert(payload).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: hapus stream
export async function DELETE(request, { params }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const streamId = searchParams.get('stream')
  if (!streamId) return Response.json({ error: 'Parameter stream wajib diisi.' }, { status: 400 })

  const { error } = await supabase.from('op_streams').delete().eq('id', streamId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
