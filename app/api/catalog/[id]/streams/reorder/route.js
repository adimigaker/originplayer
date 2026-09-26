import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

// POST /api/catalog/[id]/streams/reorder  body: { order: [streamId, streamId, ...] }
// Menulis ulang `priority` sesuai urutan array (1 = paling atas / dicoba dulu).
export async function POST(request, { params }) {
  const { id: titleId } = await params
  try {
    const b = await request.json()
    const order = Array.isArray(b.order) ? b.order : null
    if (!order || !order.length) {
      return Response.json({ error: 'order harus berupa array id stream.' }, { status: 400 })
    }

    // Validasi: semua stream yang di-reorder harus milik title ini
    const { data: milik, error: eErr } = await supabase
      .from('op_streams')
      .select('id')
      .eq('title_id', titleId)
    if (eErr) return Response.json({ error: eErr.message }, { status: 500 })

    const punya = new Set((milik || []).map((r) => String(r.id)))
    for (const sid of order) {
      if (!punya.has(String(sid))) {
        return Response.json({ error: `Stream ${sid} bukan bagian dari konten ini.` }, { status: 400 })
      }
    }

    // Tulis ulang priority 1..N
    for (let i = 0; i < order.length; i++) {
      const { error } = await supabase
        .from('op_streams')
        .update({ priority: i + 1 })
        .eq('id', order[i])
      if (error) return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, total: order.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
