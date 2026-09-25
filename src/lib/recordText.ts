import type { RecordSummary } from '../db/records'
import { estimateNursery, HAND_STYLE_LABEL } from '../domain/record'

// 記録の要点を1行にまとめる（一覧・履歴の比較用）
export function recordSettingText(s: RecordSummary): string {
  const r = s.record
  if (r.method === 'machine') {
    return [
      s.roll?.name && `ロール ${s.roll.name}`,
      s.combo && `ギヤ ${s.combo.rollTeeth}×${s.combo.wheelTeeth}`,
      r.spacingCm != null && `株間 ${r.spacingCm}cm`,
      r.rowSpacingCm != null && `畝間 ${r.rowSpacingCm}cm`,
      r.rowCount != null && `${r.rowCount}列`,
    ]
      .filter(Boolean)
      .join(' / ')
  }
  if (r.method === 'hand') {
    return [
      r.handStyle && HAND_STYLE_LABEL[r.handStyle],
      r.spacingCm != null && `株間 ${r.spacingCm}cm`,
      r.rowSpacingCm != null && `条間 ${r.rowSpacingCm}cm`,
      r.rowCount != null && `${r.rowCount}列`,
      r.areaM2 != null && `${r.areaM2}㎡`,
    ]
      .filter(Boolean)
      .join(' / ')
  }
  const n = estimateNursery(r)
  return [
    r.containerType,
    r.containerCount != null && `${r.containerCount}枚`,
    n && `${n.cells.toLocaleString()}セル`,
    r.seedsPerCell != null && `${r.seedsPerCell}粒/穴`,
  ]
    .filter(Boolean)
    .join(' / ')
}
