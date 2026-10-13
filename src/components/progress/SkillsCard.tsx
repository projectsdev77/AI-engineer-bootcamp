import { useSkillProgress } from '@/hooks/useSkillProgress'
import ProgressBar from '@/components/ui/ProgressBar'
import { CheckIcon } from '@/components/ui/icons'

/**
 * Skill-by-skill progress. A skill is mastered once every week that teaches
 * it is passed (all lessons done, all assignments passed); skills spanning
 * several weeks show how many of those weeks are done.
 */
export default function SkillsCard() {
  const { skills, loading } = useSkillProgress()
  if (loading || skills.length === 0) return null

  const masteredCount = skills.filter((s) => s.mastered).length
  // Mastered first, then in progress, then not started — each in curriculum order.
  const rank = (s: (typeof skills)[number]) => (s.mastered ? 0 : s.weeks_mastered > 0 ? 1 : 2)
  const ordered = [...skills].sort((a, b) => rank(a) - rank(b))

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="meta">Your skills</p>
        <p className="font-mono text-[11px] font-bold text-muted">
          {masteredCount}/{skills.length} mastered
        </p>
      </div>
      <div className="mt-3">
        <ProgressBar percent={Math.round((masteredCount / skills.length) * 100)} tone="lime" />
      </div>
      <ul className="mt-4 space-y-2.5 border-t-2 border-hairline pt-4">
        {ordered.map((s) => (
          <li key={s.skill} className="flex items-center justify-between gap-3">
            <span className={`flex min-w-0 items-center gap-2 text-[14px] ${s.mastered ? 'font-semibold text-ink' : 'text-ink'}`}>
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                  s.mastered ? 'border-pass bg-pass text-white' : s.weeks_mastered > 0 ? 'border-ink bg-lime' : 'border-disabled bg-surface'
                }`}
                aria-hidden="true"
              >
                {s.mastered && <CheckIcon className="h-2.5 w-2.5" />}
              </span>
              <span className="truncate">{s.skill}</span>
            </span>
            <span className="shrink-0 font-mono text-[10.5px] font-bold uppercase tracking-wide">
              {s.mastered ? (
                <span className="text-pass-ink">mastered</span>
              ) : s.weeks_total > 1 ? (
                <span className="text-muted">
                  {s.weeks_mastered}/{s.weeks_total} weeks
                </span>
              ) : (
                <span className="text-faint">week {s.week_positions[0]}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
