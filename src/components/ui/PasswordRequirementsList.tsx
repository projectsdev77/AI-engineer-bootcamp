import { PASSWORD_REQUIREMENTS } from '@/lib/passwordPolicy'
import { CheckIcon } from '@/components/ui/icons'

export default function PasswordRequirementsList({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password)
        return (
          <li key={req.id} className={`flex items-center gap-2 text-[13px] ${met ? 'text-pass-ink' : 'text-muted'}`}>
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                met ? 'border-pass bg-pass-bg' : 'border-disabled'
              }`}
            >
              {met && <CheckIcon className="h-2.5 w-2.5 text-pass-ink" />}
            </span>
            {req.label}
          </li>
        )
      })}
    </ul>
  )
}
