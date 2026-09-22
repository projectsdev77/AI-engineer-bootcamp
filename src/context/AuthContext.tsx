import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { functionErrorMessage } from '@/lib/functionsError'
import type { Profile } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: (intent?: 'login') => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<{ error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
  }

  // profiles.last_active_at otherwise never gets written anywhere — the
  // mentor dashboard's "last activity" column and send-reengagement-emails'
  // inactivity filter both read it, but a column nothing ever updates stays
  // null forever (and .lt('last_active_at', ...) never matches a null row,
  // so that edge function has never actually selected anyone). Touching it
  // once per app load is a simple, good-enough "was here recently" signal
  // without writing on every token refresh while a tab sits open.
  function touchLastActive(userId: string) {
    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId)
      .then(undefined, () => {})
  }

  // "Continue with Google" on the login page passes ?auth_intent=login
  // through the OAuth redirect (see signInWithGoogle below) — Supabase's
  // OAuth flow has no concept of login-only vs signup-only, so without
  // this check it silently creates a brand-new account the instant
  // someone with no existing account clicks what they think is a login
  // button. A freshly-created auth.users row's created_at is (to the
  // second) "just now", so that plus the intent flag is how this catches
  // it: reject by deleting the account it just made and bouncing back to
  // /login instead of letting the session stand. Returns true if it
  // handled a rejection, so the caller stops before treating this as a
  // normal signed-in session.
  async function rejectIfUnrecognizedGoogleLogin(sessionUser: User): Promise<boolean> {
    if (new URLSearchParams(window.location.search).get('auth_intent') !== 'login') return false
    const createdAt = new Date(sessionUser.created_at).getTime()
    if (Date.now() - createdAt >= 20_000) return false
    await supabase.functions.invoke('delete-account').catch(() => {})
    await supabase.auth.signOut()
    window.location.replace('/login?no_account=1')
    return true
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      if (data.session?.user && (await rejectIfUnrecognizedGoogleLogin(data.session.user))) return
      setSession(data.session)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
        touchLastActive(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user && (await rejectIfUnrecognizedGoogleLogin(newSession.user))) return
      setSession(newSession)
      if (newSession?.user) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (!error && data.user) {
      // Fire-and-forget: a failed welcome email should never block signup.
      supabase.functions.invoke('send-welcome-email', { body: { userId: data.user.id } }).catch(() => {})
    }
    // signUp only returns a session when the project doesn't require email
    // confirmation (or already has a valid one). Callers need this to know
    // whether to show a "check your email" state or just continue signed in.
    return { error: error?.message ?? null, needsEmailConfirmation: !error && !data.session }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    // Suspension is enforced app-wide by RequireAuth (which also covers
    // Google OAuth and an already-open session that gets suspended
    // mid-visit), but checking here too means a suspended student gets a
    // clear message immediately on login instead of briefly appearing
    // signed in and then being bounced back out.
    const { data: profileRow } = await supabase.from('profiles').select('status').eq('id', data.user.id).single()
    if (profileRow?.status === 'suspended') {
      await supabase.auth.signOut()
      return { error: 'This account has been suspended. Contact support if you think this is a mistake.' }
    }

    return { error: null }
  }

  async function signInWithGoogle(intent?: 'login') {
    // The redirect URL is the only way to carry "which button was this"
    // across the trip to Google and back — see rejectIfUnrecognizedGoogleLogin.
    const redirectTo =
      intent === 'login' ? `${window.location.origin}/dashboard?auth_intent=login` : `${window.location.origin}/dashboard`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id)
    }
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password/confirm`,
    })
    return { error: error?.message ?? null }
  }

  // When currentPassword is supplied (the "change password while logged in"
  // flow, as opposed to the emailed reset-link flow which already proves
  // identity), verify it against the account before applying the change —
  // updateUser alone would let anyone with a live session set a new password
  // without ever proving they knew the old one.
  async function updatePassword(newPassword: string, currentPassword?: string) {
    if (currentPassword) {
      if (!session?.user?.email) {
        return { error: 'Your session has expired. Please log in again.' }
      }
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })
      if (reauthError) {
        return { error: 'Current password is incorrect.' }
      }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  // Deletes the signed-in user's account. The edge function resolves the
  // account to delete from the caller's own verified session token, never
  // from a client-supplied id — see delete-account/index.ts. Signs out
  // locally on success since the session is invalid the moment the user
  // row is gone.
  async function deleteAccount() {
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error) {
        return { error: await functionErrorMessage(error) }
      }
      if (data?.error) {
        return { error: data.error as string }
      }
    } catch (e) {
      // A thrown network/CORS failure here (rather than the invoke's own
      // {error} field) would otherwise leave the caller's "Deleting…" state
      // stuck forever with no message — same class of silent-hang bug as
      // evaluate-submission's invoke.
      return { error: e instanceof Error ? e.message : "Couldn't reach the delete-account service." }
    }
    await supabase.auth.signOut()
    return { error: null }
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
    requestPasswordReset,
    updatePassword,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
