import { useCombos, useSpacingEntries } from '../db/queries'
import type { Machine } from '../db/types'
import { getSpacing } from '../domain/spacing'

// 穴数に対して、スプロケット組合せごとの株間を一覧表示する。
// 播種記録の入力では onSelect を渡して組合せを選ばせる。
export function SpacingPicker({
  machine,
  holes,
  selectedComboId,
  onSelect,
}: {
  machine: Machine
  holes: number
  selectedComboId?: string | null
  onSelect?: (comboId: string, spacingCm: number) => void
}) {
  const combos = useCombos(machine.id)
  const entries = useSpacingEntries(machine.id)
  if (!combos || !entries) return null
  if (holes <= 0) return <p className="muted">穴なしロールのため株間はありません。</p>

  const rows = combos.map((c) => ({ combo: c, spacing: getSpacing(c, holes, entries, machine.spacingCoefficient) }))
  const isCalc = rows.some((r) => r.spacing?.source === 'calc')

  return (
    <div>
      <div className="spacing-grid">
        {rows.map(({ combo, spacing }) => {
          const selected = combo.id === selectedComboId
          const content = (
            <>
              <span className="spacing-cm">{spacing ? `${spacing.cm}` : '–'}</span>
              <span className="spacing-unit">cm</span>
              <span className="spacing-combo">
                {combo.rollTeeth}×{combo.wheelTeeth}
              </span>
            </>
          )
          return onSelect && spacing ? (
            <button
              type="button"
              key={combo.id}
              className={`spacing-cell${selected ? ' selected' : ''}`}
              onClick={() => onSelect(combo.id, spacing.cm)}
            >
              {content}
            </button>
          ) : (
            <div key={combo.id} className={`spacing-cell${selected ? ' selected' : ''}`}>
              {content}
            </div>
          )
        })}
      </div>
      <p className="muted small">
        上段: 株間（{holes}穴） / 下段: ロール側×車輪側の歯数
        {isCalc && '。この穴数はメーカー表にないため計算値です。'}
      </p>
    </div>
  )
}
