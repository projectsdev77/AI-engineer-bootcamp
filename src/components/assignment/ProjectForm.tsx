import { useState } from 'react'
import type { ProjectConfig } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Field, FieldError, FieldHint, Label, TextAreaField } from '@/components/ui/Field'

export interface ProjectSubmission {
  repoUrl: string
  demoUrl: string
  notes: string
}

const GITHUB_REPO = /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i
const MAX_NOTES = 2000

function isUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** GitHub repo + live demo + notes. The same rules are enforced again in the database. */
export default function ProjectForm({
  config,
  disabled,
  onSubmit,
}: {
  config: ProjectConfig
  disabled: boolean
  onSubmit: (submission: ProjectSubmission) => void
}) {
  const demoRequired = config.require_demo !== false
  const [repoUrl, setRepoUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState({ repo: false, demo: false })

  const repo = repoUrl.trim()
  const demo = demoUrl.trim()
  const repoError = !repo ? 'Add your GitHub repository link.' : !GITHUB_REPO.test(repo) ? 'Use the repository link, like https://github.com/you/project' : null
  const demoError = !demo ? (demoRequired ? 'Add the link to your live demo.' : null) : !isUrl(demo) ? 'Use a full link starting with https://' : null
  const valid = !repoError && !demoError && notes.length <= MAX_NOTES

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setTouched({ repo: true, demo: true })
        if (valid) onSubmit({ repoUrl: repo, demoUrl: demo, notes: notes.trim() })
      }}
      className="space-y-5"
    >
      <div>
        <Label htmlFor="repo_url">GitHub repository</Label>
        <Field
          id="repo_url"
          type="url"
          inputMode="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, repo: true }))}
          disabled={disabled}
          placeholder="https://github.com/you/your-project"
          error={touched.repo && !!repoError}
        />
        {touched.repo && repoError ? <FieldError>{repoError}</FieldError> : <FieldHint>Make sure the repository is public.</FieldHint>}
      </div>

      <div>
        <Label htmlFor="demo_url">
          Live demo {demoRequired ? '' : <span className="normal-case text-faint">· optional</span>}
        </Label>
        <Field
          id="demo_url"
          type="url"
          inputMode="url"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, demo: true }))}
          disabled={disabled}
          placeholder="https://your-project.vercel.app"
          error={touched.demo && !!demoError}
        />
        {touched.demo && demoError ? (
          <FieldError>{demoError}</FieldError>
        ) : (
          <FieldHint>Where the project runs, such as Vercel, Streamlit or Hugging Face Spaces.</FieldHint>
        )}
      </div>

      <div>
        <Label htmlFor="project_notes">
          Description <span className="normal-case text-faint">· optional</span>
        </Label>
        <TextAreaField
          id="project_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full resize-y"
          placeholder="What it does, how you built it, anything you'd like the reviewer to know."
          error={notes.length > MAX_NOTES}
        />
        <FieldHint>
          Shown in your portfolio once the project passes. {notes.length > MAX_NOTES * 0.8 && `${notes.length}/${MAX_NOTES}`}
        </FieldHint>
      </div>

      <Button type="submit" variant="primary" disabled={disabled} className="w-full">
        Submit project
      </Button>
    </form>
  )
}
