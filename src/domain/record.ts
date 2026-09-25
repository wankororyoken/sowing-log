import type { HandSowingStyle, SowingMethod, Weather } from '../db/types'

export const METHOD_LABEL: Record<SowingMethod, string> = {
  machine: '播種機',
  hand: '手播き・その他',
  nursery: '育苗',
}

export const HAND_STYLE_LABEL: Record<HandSowingStyle, string> = {
  dibble: '点播',
  drill: 'すじ播き',
  broadcast: 'ばら播き',
}

export const WEATHER_CONDITIONS = ['晴', '曇', '雨', '雪', '晴時々曇', '曇時々雨']

export const CONTAINER_PRESETS: { label: string; cells: number | null }[] = [
  { label: 'セルトレイ 72穴', cells: 72 },
  { label: 'セルトレイ 128穴', cells: 128 },
  { label: 'セルトレイ 200穴', cells: 200 },
  { label: 'セルトレイ 288穴', cells: 288 },
  { label: 'ペーパーポット', cells: null },
  { label: 'ポリポット', cells: 1 },
  { label: '育苗箱', cells: null },
]

// 袋に対するおおよその使用量
export const BAG_FRACTIONS: { label: string; value: number }[] = [
  { label: '全部', value: 1 },
  { label: '3/4', value: 0.75 },
  { label: '1/2', value: 0.5 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/4', value: 0.25 },
  { label: '少し', value: 0.1 },
]

export function bagFractionLabel(v: number | null | undefined): string {
  if (v == null) return ''
  const hit = BAG_FRACTIONS.find((f) => Math.abs(f.value - v) < 0.001)
  if (hit) return hit.value === 1 ? '袋全部' : hit.label === '少し' ? '少し' : `袋の${hit.label}`
  return `袋の${Math.round(v * 100)}%`
}

export function emptyWeather(): Weather {
  return {
    condition: '',
    tempC: null,
    tempMaxC: null,
    tempMinC: null,
    soilTempC: null,
    humidity: null,
    windMs: null,
    precipPrev3dMm: null,
    fetchedAt: null,
  }
}

// 播種機：播種延長と株間から、おおよその播種穴数を出す
export function estimateMachineHoles(opts: {
  lengthM: number | null
  spacingCm: number | null
  rowCount: number | null
  rollRows?: number | null
}): number | null {
  const { lengthM, spacingCm, rowCount } = opts
  if (!lengthM || !spacingCm || spacingCm <= 0) return null
  return Math.floor((lengthM * 100) / spacingCm) * (rowCount || 1) * (opts.rollRows || 1)
}

// 育苗：セル数と粒数
export function estimateNursery(opts: {
  cellsPerContainer: number | null
  containerCount: number | null
  seedsPerCell: number | null
}): { cells: number; seeds: number | null } | null {
  const { cellsPerContainer, containerCount, seedsPerCell } = opts
  if (!cellsPerContainer || !containerCount) return null
  const cells = cellsPerContainer * containerCount
  return { cells, seeds: seedsPerCell ? cells * seedsPerCell : null }
}

// datetime-local の値 ⇔ ISO
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}
