import { ChevronUpIcon, ChevronDownIcon } from '@/components/ui/icons'

export default function ReorderButtons({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="flex flex-col">
      <button onClick={onMoveUp} disabled={!canMoveUp} aria-label="Move up" className="text-ink hover:text-blue-700 disabled:opacity-20">
        <ChevronUpIcon className="h-4 w-4" />
      </button>
      <button onClick={onMoveDown} disabled={!canMoveDown} aria-label="Move down" className="text-ink hover:text-blue-700 disabled:opacity-20">
        <ChevronDownIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
