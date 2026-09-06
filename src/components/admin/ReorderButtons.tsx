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
      <button
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label="Move up"
        className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
      >
        ▲
      </button>
      <button
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label="Move down"
        className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
      >
        ▼
      </button>
    </div>
  )
}
