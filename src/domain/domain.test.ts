import { describe, expect, it } from 'vitest'
import { AP1_COMBOS, AP1_SPACING_TABLE } from './ap1'
import { parseRollName, rollNameKey } from './roll'
import { calcSpacing, estimateCoefficient, getSpacing } from './spacing'

describe('parseRollName', () => {
  it.each([
    ['A6', { holeSpec: 'A', holes: 6, rows: 1 }],
    ['a-6', { holeSpec: 'A', holes: 6, rows: 1 }],
    ['Ｙ－１２', { holeSpec: 'Y', holes: 12, rows: 1 }],
    ['AA-12', { holeSpec: 'AA', holes: 12, rows: 1 }],
    ['XL-20-1', { holeSpec: 'XL', holes: 20, rows: 1 }],
    ['XL-3-3', { holeSpec: 'XL', holes: 3, rows: 3 }],
    ['R3-4-1', { holeSpec: 'R3', holes: 4, rows: 1 }],
    ['2L-30-1', { holeSpec: '2L', holes: 30, rows: 1 }],
    ['S2L-16-1', { holeSpec: 'S2L', holes: 16, rows: 1 }],
    ['Z', { holeSpec: 'Z', holes: 0, rows: 1 }],
  ])('%s', (input, expected) => {
    expect(parseRollName(input)).toEqual(expected)
  })

  it('読めない名前は null', () => {
    expect(parseRollName('自作ロール')).toBeNull()
    expect(parseRollName('')).toBeNull()
  })

  it('表記ゆれを同一視する', () => {
    expect(rollNameKey('A-6')).toBe(rollNameKey('a６'))
  })
})

describe('AP-1 株間', () => {
  const combos = AP1_COMBOS.map(([r, w], i) => ({ id: `c${i}`, rollTeeth: r, wheelTeeth: w }))
  const entries = Object.entries(AP1_SPACING_TABLE).flatMap(([holes, row]) =>
    row.map((cm, i) => ({ comboId: `c${i}`, holes: Number(holes), spacingCm: cm })),
  )
  const k = estimateCoefficient(combos, entries)!

  it('係数はおよそ 98', () => {
    expect(k).toBeGreaterThan(97)
    expect(k).toBeLessThan(100)
  })

  it('計算式はメーカー表と ±1.5cm 以内で一致する', () => {
    for (const e of entries) {
      const c = combos.find((x) => x.id === e.comboId)!
      expect(Math.abs(calcSpacing(k, c.rollTeeth, c.wheelTeeth, e.holes) - e.spacingCm)).toBeLessThanOrEqual(1.5)
    }
  })

  it('表にある穴数は表の値、ない穴数は計算値', () => {
    expect(getSpacing(combos[0], 6, entries, k)).toEqual({ cm: 26, source: 'table' })
    const r = getSpacing(combos[0], 5, entries, k)!
    expect(r.source).toBe('calc')
    expect(r.cm).toBeCloseTo(30.6, 0)
    expect(getSpacing(combos[0], 0, entries, k)).toBeNull()
  })
})
