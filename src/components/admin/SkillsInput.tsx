import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const MAX_SKILLS = 12
export const MAX_SKILL_LENGTH = 40

/** Every skill already used on any week, for suggestions — keeps "Python" from becoming "python" on the next week. */
function useKnownSkills() {
  const [skills, setSkills] = useState<string[]>([])
  useEffect(() => {
    void supabase
      .from('weeks')
      .select('skills')
      .then(({ data }) => {
        const seen = new Map<string, string>()
        for (const row of (data ?? []) as { skills: string[] | null }[]) {
          for (const s of row.skills ?? []) if (!seen.has(s.toLowerCase())) seen.set(s.toLowerCase(), s)
        }
        setSkills([...seen.values()].sort((a, b) => a.localeCompare(b)))
      })
  }, [])
  return skills
}

/** Tag input: type a skill and press Enter (or comma) to add; × removes. */
export default function SkillsInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string[]
  onChange: (skills: string[]) => void
}) {
  const known = useKnownSkills()
  const [draft, setDraft] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  function add(raw: string) {
    const typed = raw.trim().replace(/\s+/g, ' ')
    if (!typed) return
    // Reuse the existing spelling if this skill is already used elsewhere.
    const name = known.find((k) => k.toLowerCase() === typed.toLowerCase()) ?? typed
    if (name.length > MAX_SKILL_LENGTH) return setHint(`Keep skills under ${MAX_SKILL_LENGTH} characters.`)
    if (value.some((v) => v.toLowerCase() === name.toLowerCase())) {
      setDraft('')
      return setHint(`${name} is already on this week.`)
    }
    if (value.length >= MAX_SKILLS) return setHint(`Up to ${MAX_SKILLS} skills per week.`)
    onChange([...value, name])
    setDraft('')
    setHint(null)
  }

  const suggestions = known.filter((k) => !value.some((v) => v.toLowerCase() === k.toLowerCase()))

  return (
    <div>
      <div className="field flex min-h-[52px] flex-wrap items-center gap-2 py-2">
        {value.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1.5 rounded-full border-2 border-ink bg-lime px-2.5 py-0.5 text-[13px] font-semibold text-ink"
          >
            {skill}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== skill))}
              className="text-ink/60 hover:text-ink"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          list={`${id}-suggestions`}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) add(v.slice(0, -1))
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? 'e.g. Python, Vector Databases' : 'Add a skill…'}
          className="min-w-[160px] flex-1 border-0 bg-transparent p-0 text-[15px] outline-none focus:ring-0"
        />
        <datalist id={`${id}-suggestions`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        {hint ?? 'Press Enter or comma to add. Students master these skills by passing every lesson and assignment in this week.'}
      </p>
    </div>
  )
}
