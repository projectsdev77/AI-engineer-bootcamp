// Hand-written types mirroring supabase/migrations. Regenerate with
// `supabase gen types typescript` once a live project exists; keep in sync
// with the schema until then.

export type UserRole = 'student' | 'mentor' | 'admin'
export type AccountStatus = 'active' | 'suspended'
export type PublishStatus = 'draft' | 'published'
export type ResourceType = 'video' | 'article' | 'docs' | 'paper' | 'repo' | 'tool' | 'other'
export type AssignmentType = 'quiz' | 'text' | 'url'
export type EnrollmentStatus = 'active' | 'completed' | 'withdrawn'
export type UnlockSource = 'system' | 'admin'
export type EvalStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'needs_review'
export type SubmissionStatus = 'pending' | 'passed' | 'needs_work'
export type SubmissionAction =
  | 'submitted'
  | 'ai_evaluated'
  | 'ai_failed'
  | 'status_overridden'
  | 'feedback_edited'
export type EmailType = 'reengagement' | 'welcome'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  status: AccountStatus
  background: string | null
  weekly_hours_target: number | null
  onboarding_completed_at: string | null
  last_active_at: string | null
  created_at: string
}

export interface Track {
  id: string
  title: string
  slug: string
  description: string | null
  status: PublishStatus
  created_at: string
}

export interface Week {
  id: string
  track_id: string
  position: number
  title: string
  goal: string | null
  summary: string | null
  estimated_hours: number | null
  status: PublishStatus
  published_at: string | null
  created_at: string
}

export interface Lesson {
  id: string
  week_id: string
  position: number
  title: string
  slug: string
  body: string | null
  estimated_minutes: number | null
  status: PublishStatus
  created_at: string
}

export interface Resource {
  id: string
  lesson_id: string
  position: number
  title: string
  url: string
  resource_type: ResourceType
  source_name: string | null
  estimated_minutes: number | null
  is_required: boolean
  last_checked_at: string | null
  last_status_code: number | null
  is_broken: boolean
  created_at: string
}

export interface QuizConfig {
  pass_threshold: number
}
export interface TextConfig {
  min_words: number
  max_words: number
}
export interface UrlConfig {
  allowed_hosts: string[]
  require_public: boolean
}

export interface Assignment {
  id: string
  week_id: string
  position: number
  title: string
  instructions: string
  assignment_type: AssignmentType
  rubric: string | null
  config: QuizConfig | TextConfig | UrlConfig | Record<string, never>
  status: PublishStatus
  created_at: string
}

export interface QuizQuestion {
  id: string
  assignment_id: string
  position: number
  prompt: string
  explanation: string | null
}

export interface QuizOption {
  id: string
  question_id: string
  position: number
  text: string
  is_correct: boolean // never selected for students; service-role only
}

export interface Enrollment {
  id: string
  user_id: string
  track_id: string
  status: EnrollmentStatus
  enrolled_at: string
  completed_at: string | null
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  started_at: string
  completed_at: string | null
}

export interface ResourceProgress {
  id: string
  user_id: string
  resource_id: string
  completed_at: string
}

export interface WeekUnlock {
  id: string
  user_id: string
  week_id: string
  unlocked_at: string
  unlocked_by: UnlockSource
  unlocked_by_user_id: string | null
  reason: string | null
}

export interface Submission {
  id: string
  user_id: string
  assignment_id: string
  attempt_number: number
  submitted_at: string
  content: string | null
  quiz_score: number | null
  evaluation_status: EvalStatus
  ai_feedback: string | null
  ai_suggested_status: SubmissionStatus | null
  ai_model: string | null
  ai_error: string | null
  final_status: SubmissionStatus
  flagged_for_review_at: string | null
  flag_reason: string | null
  human_feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  assignment_version: Record<string, unknown> | null
}

export interface QuizAnswer {
  id: string
  submission_id: string
  question_id: string
  selected_option_id: string
}

export interface SubmissionEvent {
  id: string
  submission_id: string
  actor_user_id: string | null
  action: SubmissionAction
  from_status: string | null
  to_status: string | null
  note: string | null
  created_at: string
}

export interface MentorAssignment {
  id: string
  mentor_id: string
  student_id: string
  assigned_at: string
  is_active: boolean
}

export interface Message {
  id: string
  student_id: string
  sender_id: string
  submission_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

export interface CertificateTemplate {
  id: string
  name: string
  title_text: string
  body_text: string
  signature_name: string | null
  signature_title: string | null
  logo_url: string | null
  accent_color: string | null
  is_active: boolean
}

export interface Certificate {
  id: string
  user_id: string
  enrollment_id: string
  template_id: string
  code: string
  rendered_snapshot: Record<string, string>
  issued_at: string
}

export interface EmailLogEntry {
  id: string
  user_id: string
  email_type: EmailType
  sent_at: string
}
