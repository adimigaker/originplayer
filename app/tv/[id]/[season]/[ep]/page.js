import { notFound } from 'next/navigation'

export default async function WatchTVPage({ params }) {
  const { id, season, ep } = await params
  return <div className="p-8 text-white">Nonton {id} S{season} E{ep}</div>
}
