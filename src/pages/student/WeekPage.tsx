import { useParams } from 'react-router-dom'
import AppNav from '@/components/layout/AppNav'

export default function WeekPage() {
  const { weekId } = useParams()
  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-slate-500">Week detail (lessons + assignments) coming soon. Week id: {weekId}</p>
      </main>
    </div>
  )
}
