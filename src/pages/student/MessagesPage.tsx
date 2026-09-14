import { useAuth } from '@/context/AuthContext'
import AppNav from '@/components/layout/AppNav'
import MessageThread from '@/components/messages/MessageThread'

export default function MessagesPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-paper">
      <AppNav />
      <main className="mx-auto max-w-[700px] px-4 py-10 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted">[ your mentor ]</p>
        <h1 className="mt-2 font-display text-[38px] font-bold tracking-[-0.03em] text-ink">Messages</h1>
        <p className="mt-2 text-[14.5px] text-muted">
          A direct line to your mentor — ask questions, share context, or request a second look at feedback.
        </p>

        {user && (
          <div className="mt-6">
            <MessageThread studentId={user.id} />
          </div>
        )}
      </main>
    </div>
  )
}
