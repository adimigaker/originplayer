import { notFound } from 'next/navigation'

export default async function TVPage({ params }) {
  const { id } = await params
  return <div className="p-8 text-white">Info TV Series {id}</div>
}
