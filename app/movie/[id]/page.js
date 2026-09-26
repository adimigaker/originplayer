import { notFound } from 'next/navigation'

export default async function MoviePage({ params }) {
  const { id } = await params
  return <div className="p-8 text-white">Nonton Movie {id}</div>
}
