import { describe, expect, it } from 'vitest'
import { remapForFarm, rollKey, type LocalNames, type Tables } from './merge'

const A = 'farm-a'
const B = 'farm-b'
const base = (id: string, extra: Record<string, unknown> = {}) => ({ id, farmId: A, deletedAt: null, updatedAt: '2026-10-01', ...extra })

// 端末A（farm-a）で記録したデータ
const fromA: Tables = {
  farms: [base(A, { name: 'Aの農場' })],
  crops: [base('crop-a-daikon', { name: 'ダイコン' }), base('crop-a-kabu', { name: 'カブ' })],
  fields: [base('field-a-kita', { name: '北畑A' })],
  machines: [base(`${A}:ap1`, { name: 'AP-1' })],
  sprocketCombos: [base(`${A}:ap1:combo:10-13`, { machineId: `${A}:ap1` })],
  rolls: [base('roll-a-q4', { machineId: `${A}:ap1`, name: 'Q-4' })],
  eventTypes: [base(`${A}:event:発芽`, { name: '発芽' }), base('ev-a-tekishin', { name: '摘心' })],
  seeds: [base('seed-a1', { cropId: 'crop-a-daikon', photoFrontId: 'photo-a1', photoBackId: null })],
  sowingRecords: [
    base('rec-a1', {
      cropId: 'crop-a-daikon',
      fieldId: 'field-a-kita',
      machineId: `${A}:ap1`,
      rollId: 'roll-a-q4',
      comboId: `${A}:ap1:combo:10-13`,
      photoIds: ['photo-a2'],
    }),
  ],
  sowingSeeds: [base('line-a1', { recordId: 'rec-a1', seedId: 'seed-a1' })],
  progressEvents: [base('evt-a1', { recordId: 'rec-a1', eventTypeId: `${A}:event:発芽`, transplantFieldId: null, photoIds: [] })],
  photos: [base('photo-a1'), base('photo-a2')],
}

// 端末B（farm-b）にすでにあるもの
const localB: LocalNames = {
  crops: new Map([['ダイコン', 'crop-b-daikon']]),
  fields: new Map([['北畑A', 'field-b-kita']]),
  rolls: new Map([[rollKey(`${B}:ap1`, 'Q4'), 'roll-b-q4']]),
  eventTypes: new Map([['発芽', `${B}:event:発芽`]]),
}

describe('別の端末のデータの統合', () => {
  const { tables, unified } = remapForFarm(fromA, A, B, localB)

  it('すべての行をこの端末の農場に入れ、農場そのものは取り込まない', () => {
    expect(tables.farms).toBeUndefined()
    for (const rows of Object.values(tables)) for (const r of rows) expect(r.farmId).toBe(B)
  })

  it('同じ名前の作物・圃場・ロール・経過の種類は1つにまとめる', () => {
    expect(tables.crops.map((c) => c.id)).toEqual(['crop-a-kabu']) // カブはBにないので残る
    expect(tables.fields).toEqual([])
    expect(tables.rolls).toEqual([]) // Q-4 と Q4 は同じロール
    // 初期の「発芽」は接頭辞を付け替えると同じIDになるので、まとめずに更新日時で突き合わせる
    expect(tables.eventTypes.map((t) => t.id)).toEqual([`${B}:event:発芽`, 'ev-a-tekishin'])
    expect(unified).toBe(3)
  })

  it('初期マスタの固定IDは農場IDの接頭辞を付け替える', () => {
    expect(tables.machines[0].id).toBe(`${B}:ap1`)
    expect(tables.sprocketCombos[0]).toMatchObject({ id: `${B}:ap1:combo:10-13`, machineId: `${B}:ap1` })
  })

  it('播種記録などの参照を付け替え、UUID の行はそのまま残す', () => {
    expect(tables.sowingRecords[0]).toMatchObject({
      id: 'rec-a1',
      cropId: 'crop-b-daikon',
      fieldId: 'field-b-kita',
      machineId: `${B}:ap1`,
      rollId: 'roll-b-q4',
      comboId: `${B}:ap1:combo:10-13`,
      photoIds: ['photo-a2'],
    })
    expect(tables.seeds[0]).toMatchObject({ id: 'seed-a1', cropId: 'crop-b-daikon', photoFrontId: 'photo-a1', photoBackId: null })
    expect(tables.sowingSeeds[0]).toMatchObject({ recordId: 'rec-a1', seedId: 'seed-a1' })
    expect(tables.progressEvents[0]).toMatchObject({ eventTypeId: `${B}:event:発芽` })
    expect(tables.photos.map((p) => p.id)).toEqual(['photo-a1', 'photo-a2'])
  })

  it('同じ農場どうし（自分のバックアップ）では何も書き換えない', () => {
    const same = remapForFarm(fromA, A, A, {
      crops: new Map([['ダイコン', 'crop-a-daikon']]),
      fields: new Map(),
      rolls: new Map(),
      eventTypes: new Map(),
    })
    expect(same.unified).toBe(0)
    expect(same.tables.sowingRecords[0]).toEqual(fromA.sowingRecords[0])
  })
})
