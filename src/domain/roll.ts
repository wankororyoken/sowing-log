export interface ParsedRollName {
  holeSpec: string
  holes: number
  rows: number
}

// ロール名から「穴の規格・1周の穴数・列数」を読み取る。
//   A6 / A-6      → 規格 A,   6穴, 1列
//   Y-12          → 規格 Y,  12穴, 1列
//   XL-20-1       → 規格 XL, 20穴, 1列（コート用：穴記号-穴数-列数）
//   R3-4-1        → 規格 R3,  4穴, 1列
//   Z             → 穴なし
// 読み取れない場合は null（手入力してもらう）。
export function parseRollName(input: string): ParsedRollName | null {
  const name = input.normalize('NFKC').trim().toUpperCase().replace(/[‐－―ー−]/g, '-')
  if (!name) return null
  if (name === 'Z') return { holeSpec: 'Z', holes: 0, rows: 1 }

  const parts = name.split('-').filter(Boolean)
  if (parts.length === 3 && /^\d+$/.test(parts[1]) && /^\d+$/.test(parts[2])) {
    return { holeSpec: parts[0], holes: Number(parts[1]), rows: Number(parts[2]) }
  }
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return { holeSpec: parts[0], holes: Number(parts[1]), rows: 1 }
  }
  const m = name.match(/^([A-Z]+)(\d+)$/)
  if (m) return { holeSpec: m[1], holes: Number(m[2]), rows: 1 }
  return null
}

// 表記ゆれを吸収した比較用キー（A-6 と A6 を同一視）
export function rollNameKey(input: string): string {
  return input.normalize('NFKC').trim().toUpperCase().replace(/[-‐－―ー−\s]/g, '')
}
