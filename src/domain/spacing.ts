export interface ComboLike {
  id: string
  rollTeeth: number
  wheelTeeth: number
}

export interface SpacingEntryLike {
  comboId: string
  holes: number
  spacingCm: number
}

export interface SpacingResult {
  cm: number
  source: 'table' | 'calc'
}

// 株間 ≒ 係数 ×（ロール側歯数 ÷ 車輪側歯数）÷ 穴数
export function calcSpacing(coefficient: number, rollTeeth: number, wheelTeeth: number, holes: number): number {
  return (coefficient * rollTeeth) / wheelTeeth / holes
}

// メーカー表に値があれば表の値、なければ計算値を返す。穴なし（0穴）は null。
export function getSpacing(
  combo: ComboLike,
  holes: number,
  entries: SpacingEntryLike[],
  coefficient: number | null,
): SpacingResult | null {
  if (!holes || holes <= 0) return null
  const hit = entries.find((e) => e.comboId === combo.id && e.holes === holes)
  if (hit) return { cm: hit.spacingCm, source: 'table' }
  if (!coefficient) return null
  return { cm: Math.round(calcSpacing(coefficient, combo.rollTeeth, combo.wheelTeeth, holes) * 10) / 10, source: 'calc' }
}

// 表の値から係数を最小二乗で推定する（自作ロール用の計算に使う）
export function estimateCoefficient(combos: ComboLike[], entries: SpacingEntryLike[]): number | null {
  let num = 0
  let den = 0
  for (const e of entries) {
    const c = combos.find((x) => x.id === e.comboId)
    if (!c) continue
    const x = c.rollTeeth / c.wheelTeeth / e.holes
    num += x * e.spacingCm
    den += x * x
  }
  return den > 0 ? num / den : null
}
