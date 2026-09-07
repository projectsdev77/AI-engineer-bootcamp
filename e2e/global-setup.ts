// Runs once before the whole suite (see playwright.config.ts globalSetup).
// Provisions three persistent, idempotent test accounts directly against
// the real Supabase project via the Admin API (same approach as
// scripts/create-test-users.mjs) and links the test mentor to the test
// student, so mentor-facing specs (assigned students, messaging) have
// something real to look at without a human doing it by hand first.
//
// Deliberately does NOT touch curriculum content or delete anything here —
// destructive/throwaway flows (signup, account deletion) provision their
// own one-off accounts inline in their own spec files.
import { loadTestEnv, requireEnv } from './helpers/env'
import { supabaseAdmin, upsertAuthUser, setProfileRole } from './helpers/supabaseAdmin'

export default async function globalSetup() {
  const env = loadTestEnv()
  requireEnv(env, [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'TEST_MENTOR_EMAIL',
    'TEST_MENTOR_PASSWORD',
    'TEST_STUDENT_EMAIL',
    'TEST_STUDENT_PASSWORD',
  ])

  console.log('[e2e global-setup] provisioning persistent test accounts against', env.VITE_SUPABASE_URL)

  const adminId = await upsertAuthUser(env.TEST_ADMIN_EMAIL!, env.TEST_ADMIN_PASSWORD!, 'E2E Test Admin')
  await setProfileRole(adminId, 'admin', 'E2E Test Admin')

  const mentorId = await upsertAuthUser(env.TEST_MENTOR_EMAIL!, env.TEST_MENTOR_PASSWORD!, 'E2E Test Mentor')
  await setProfileRole(mentorId, 'mentor', 'E2E Test Mentor')

  const studentId = await upsertAuthUser(env.TEST_STUDENT_EMAIL!, env.TEST_STUDENT_PASSWORD!, 'E2E Test Student')
  await setProfileRole(studentId, 'student', 'E2E Test Student')

  // Assign the test mentor to the test student. Direct table writes (not
  // the admin_reassign_mentor RPC) because this runs with the service-role
  // key, which has no auth.uid() — the RPC's own is_admin() check would
  // reject it. Mirrors exactly what that RPC does: deactivate any existing
  // active assignment, then insert the new one.
  const db = supabaseAdmin()
  const { error: deactivateErr } = await db
    .from('mentor_assignments')
    .update({ is_active: false })
    .eq('student_id', studentId)
    .eq('is_active', true)
  if (deactivateErr) throw deactivateErr

  const { data: existing, error: existingErr } = await db
    .from('mentor_assignments')
    .select('id')
    .eq('student_id', studentId)
    .eq('mentor_id', mentorId)
    .eq('is_active', true)
    .maybeSingle()
  if (existingErr) throw existingErr
  if (!existing) {
    const { error: insertErr } = await db
      .from('mentor_assignments')
      .insert({ mentor_id: mentorId, student_id: studentId, is_active: true })
    if (insertErr) throw insertErr
  }

  console.log('[e2e global-setup] done: admin, mentor, student ready; mentor <-> student linked')

  // Surfaced so specs can assert on the exact ids without re-querying.
  process.env.E2E_ADMIN_ID = adminId
  process.env.E2E_MENTOR_ID = mentorId
  process.env.E2E_STUDENT_ID = studentId
}
