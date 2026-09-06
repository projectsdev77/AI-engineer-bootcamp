import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { profile, signOut } = useAuth()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <button onClick={() => void signOut()} className="text-sm text-slate-500 hover:text-slate-700">
          Log out
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-600">Dashboard content coming soon.</p>
    </main>
  )
}
