import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { findOrCreateCrop } from '../db/queries'
import { saveRecord } from '../db/records'
import { initApp } from '../db/init'
import { createEntity, getSession, listAlive } from '../db/repo'
import { emptyWeather } from '../domain/record'
import type { NewEntity, SowingRecord } from '../db/types'
import { importBackup } from './backup'

const A = 'farm-device-a'
const t = (d: string) => `2026-10-${d}T00:00:00.000Z`
const meta = (id: string, updated = '10') => ({ id, farmId: A, createdBy: 'user-a', updatedBy: 'user-a', createdAt: t('01'), updatedAt: t(updated), deletedAt: null })

function record(cropId: string, fieldId: string | null, sownAt: string): NewEntity<SowingRecord> {
  return {
    sownAt,
    method: 'hand',
    cropId,
    fieldId,
    weather: emptyWeather(),
    memo: '',
    photoIds: [],
    machineId: null,
    rollId: null,
    comboId: null,
    spacingCm: null,
    measuredSpacingCm: null,
    rowSpacingCm: null,
    rowCount: 1,
    lengthM: null,
    handStyle: null,
    areaM2: null,
    containerType: '',
    cellsPerContainer: null,
    containerCount: null,
    seedsPerCell: null,
    soilMix: '',
  }
}

// 端末Aで書き出したファイル（端末Aでも「ダイコン」「北畑A」を別々に作っている）
function backupFromDeviceA() {
  return {
    app: 'sowing-log' as const,
    format: 1 as const,
    exportedAt: t('15'),
    farmId: A,
    exportedBy: 'A',
    tables: {
      farms: [{ ...meta(A), name: 'Aの農場' }],
      crops: [
        { ...meta('crop-a-daikon'), name: 'ダイコン', kana: '', family: '' },
        { ...meta('crop-a-kabu'), name: 'カブ', kana: '', family: '' },
      ],
      fields: [{ ...meta('field-a-kita'), name: '北畑A', kind: 'open', areaA: null, lat: null, lng: null, memo: '' }],
      eventTypes: [{ ...meta(`${A}:event:発芽`, '01'), name: '発芽', order: 0, builtin: true }],
      sowingRecords: [
        { ...meta('rec-a-daikon'), ...record('crop-a-daikon', 'field-a-kita', t('05')) },
        { ...meta('rec-a-kabu'), ...record('crop-a-kabu', 'field-a-kita', t('06')) },
      ],
      progressEvents: [
        {
          ...meta('evt-a'),
          recordId: 'rec-a-daikon',
          date: '2026-10-09',
          eventTypeId: `${A}:event:発芽`,
          rating: '○',
          value: null,
          valueUnit: '',
          memo: '',
          photoIds: [],
          transplantFieldId: null,
        },
      ],
    },
  }
}

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
  await initApp()
})

describe('別の端末のバックアップの統合', () => {
  it('この端末のデータを残したまま取り込み、同じ名前の作物・圃場は1つにまとめる', async () => {
    // 端末B（この端末）でも記録している
    const daikon = await findOrCreateCrop('ダイコン')
    const field = await createEntity(db.fields, { name: '北畑A', kind: 'open', areaA: null, lat: null, lng: null, memo: '' })
    await saveRecord(record(daikon.id, field.id, t('04')), [])
    const farmB = getSession().farmId

    const r = await importBackup(backupFromDeviceA())

    expect(r.mode).toBe('merge')
    expect(getSession().farmId).toBe(farmB) // 農場は切り替わらない
    const records = await listAlive(db.sowingRecords)
    expect(records).toHaveLength(3) // Bの1件 + Aの2件
    expect(records.every((x) => x.farmId === farmB)).toBe(true)

    const crops = await listAlive(db.crops)
    expect(crops.map((c) => c.name).sort()).toEqual(['カブ', 'ダイコン']) // ダイコンは1つ
    const daikonRecords = records.filter((x) => x.cropId === daikon.id)
    expect(daikonRecords).toHaveLength(2) // AのダイコンもBの作物に付け替わる
    expect(records.every((x) => x.fieldId === field.id)).toBe(true)
    expect(await listAlive(db.fields)).toHaveLength(1)

    // 発芽の経過はBの「発芽」を指す
    const [evt] = await listAlive(db.progressEvents)
    expect(evt.eventTypeId).toBe(`${farmB}:event:発芽`)
    expect(r.unified).toBe(2) // ダイコン・北畑A
  })

  it('もう一度読み込んでも重複しない。相手側で新しく編集した記録は反映される', async () => {
    await findOrCreateCrop('ダイコン')
    await importBackup(backupFromDeviceA())
    const again = backupFromDeviceA()
    again.tables.sowingRecords[0] = { ...again.tables.sowingRecords[0], memo: 'Aで追記', updatedAt: t('20') }
    const r = await importBackup(again)
    expect(r.updated).toBe(1)
    const records = await listAlive(db.sowingRecords)
    expect(records).toHaveLength(2)
    expect(records.find((x) => x.id === 'rec-a-daikon')?.memo).toBe('Aで追記')
  })

  it('この端末が空なら、バックアップの農場に切り替えて復元する', async () => {
    const r = await importBackup(backupFromDeviceA())
    expect(r.mode).toBe('restore')
    expect(getSession().farmId).toBe(A)
    expect(await listAlive(db.sowingRecords)).toHaveLength(2)
  })
})
