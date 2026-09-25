import { describe, expect, it } from 'vitest'
import { bagFractionLabel, estimateMachineHoles, estimateNursery } from './record'

describe('播種量', () => {
  it('袋の割合を表示用に変換する', () => {
    expect(bagFractionLabel(1)).toBe('袋全部')
    expect(bagFractionLabel(0.5)).toBe('袋の1/2')
    expect(bagFractionLabel(1 / 3)).toBe('袋の1/3')
    expect(bagFractionLabel(0.1)).toBe('少し')
    expect(bagFractionLabel(0.6)).toBe('袋の60%')
    expect(bagFractionLabel(null)).toBe('')
  })

  it('播種機の推定穴数 = 延長 ÷ 株間 × 列数 × ロール列数', () => {
    expect(estimateMachineHoles({ lengthM: 100, spacingCm: 25, rowCount: 2 })).toBe(800)
    expect(estimateMachineHoles({ lengthM: 10, spacingCm: 3, rowCount: 1, rollRows: 3 })).toBe(999)
    expect(estimateMachineHoles({ lengthM: null, spacingCm: 25, rowCount: 2 })).toBeNull()
  })

  it('育苗のセル数・粒数', () => {
    expect(estimateNursery({ cellsPerContainer: 128, containerCount: 5, seedsPerCell: 2 })).toEqual({ cells: 640, seeds: 1280 })
    expect(estimateNursery({ cellsPerContainer: 128, containerCount: 5, seedsPerCell: null })).toEqual({ cells: 640, seeds: null })
    expect(estimateNursery({ cellsPerContainer: null, containerCount: 5, seedsPerCell: 1 })).toBeNull()
  })
})
