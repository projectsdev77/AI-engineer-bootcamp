import type { AssignmentType } from '@/types/database'

/** How each assignment type is named in the UI. */
export const ASSIGNMENT_TYPE_LABEL: Record<AssignmentType, string> = {
  quiz: 'Quiz',
  project: 'Project',
  text: 'Written',
  url: 'Link',
}

/** Order and wording for the admin "new assignment" picker. */
export const ASSIGNMENT_TYPE_OPTIONS: { value: AssignmentType; label: string }[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'project', label: 'Project submission' },
  { value: 'text', label: 'Written answer' },
  { value: 'url', label: 'Single link' },
]
