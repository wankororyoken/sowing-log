import { db } from './db'
import { createEntity, getSession, listAlive, softDelete, updateEntity } from './repo'
import type { Crop, EventType, Field, NewEntity, ProgressEvent, Roll, Seed, SowingRecord, SowingSeed, SprocketCombo } from './types'

export interface SeedLine {
  id?: string // 既存の SowingSeed を編集するとき
  seedId: string
  bagFraction: number | null
  amountValue: number | null
  amountUnit: string
}

// 播種記録と、使った種袋の行をまとめて保存する（編集時は差分を反映）
export async function saveRecord(data: NewEntity<SowingRecord>, lines: SeedLine[], id?: string): Promise<string> {
  return db.transaction('rw', db.sowingRecords, db.sowingSeeds, async () => {
    let recordId = id
    if (recordId) await updateEntity(db.sowingRecords, recordId, data)
    else recordId = (await createEntity(db.sowingRecords, data)).id

    const existing = await db.sowingSeeds
      .where('recordId')
      .equals(recordId)
      .filter((r) => !r.deletedAt)
      .toArray()
    const keep = new Set(lines.map((l) => l.id).filter(Boolean))
    for (const e of existing) if (!keep.has(e.id)) await softDelete(db.sowingSeeds, e.id)
    for (const l of lines) {
      const row: NewEntity<SowingSeed> = {
        recordId,
        seedId: l.seedId,
        bagFraction: l.bagFraction,
        amountValue: l.amountValue,
        amountUnit: l.amountUnit,
      }
      if (l.id && existing.some((e) => e.id === l.id)) await updateEntity(db.sowingSeeds, l.id, row)
      else await createEntity(db.sowingSeeds, row)
    }
    return recordId
  })
}

export async function deleteRecord(id: string) {
  await db.transaction('rw', db.sowingRecords, db.sowingSeeds, db.progressEvents, async () => {
    const lines = await db.sowingSeeds.where('recordId').equals(id).toArray()
    for (const l of lines) if (!l.deletedAt) await softDelete(db.sowingSeeds, l.id)
    const events = await db.progressEvents.where('recordId').equals(id).toArray()
    for (const e of events) if (!e.deletedAt) await softDelete(db.progressEvents, e.id)
    await softDelete(db.sowingRecords, id)
  })
}

export async function getRecordLines(recordId: string): Promise<SowingSeed[]> {
  return db.sowingSeeds
    .where('recordId')
    .equals(recordId)
    .filter((r) => !r.deletedAt)
    .toArray()
}

export interface RecordSummary {
  record: SowingRecord
  crop?: Crop
  field?: Field
  seeds: { line: SowingSeed; seed?: Seed }[]
  roll?: Roll
  combo?: SprocketCombo
  events: { event: ProgressEvent; type?: EventType; transplantField?: Field }[] // 日付順
}

// 一覧表示用に、関連するマスタをまとめて引く（件数は多くない前提で全件読み込み）
export async function loadSummaries(filter?: (r: SowingRecord) => boolean): Promise<RecordSummary[]> {
  const farmId = getSession().farmId
  const records = (await listAlive(db.sowingRecords)).filter((r) => !filter || filter(r))
  records.sort((a, b) => b.sownAt.localeCompare(a.sownAt))
  const ids = new Set(records.map((r) => r.id))
  const [crops, fields, seeds, rolls, combos, lines, events, eventTypes] = await Promise.all([
    db.crops.where('farmId').equals(farmId).toArray(),
    db.fields.where('farmId').equals(farmId).toArray(),
    db.seeds.where('farmId').equals(farmId).toArray(),
    db.rolls.where('farmId').equals(farmId).toArray(),
    db.sprocketCombos.where('farmId').equals(farmId).toArray(),
    db.sowingSeeds.where('farmId').equals(farmId).filter((l) => !l.deletedAt && ids.has(l.recordId)).toArray(),
    db.progressEvents.where('farmId').equals(farmId).filter((e) => !e.deletedAt && ids.has(e.recordId)).toArray(),
    db.eventTypes.where('farmId').equals(farmId).toArray(),
  ])
  // 削除済みマスタも過去の記録の表示には使う
  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))
  const cropM = byId(crops)
  const fieldM = byId(fields)
  const seedM = byId(seeds)
  const rollM = byId(rolls)
  const comboM = byId(combos)
  const typeM = byId(eventTypes)
  events.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  return records.map((record) => ({
    record,
    crop: record.cropId ? cropM.get(record.cropId) : undefined,
    field: record.fieldId ? fieldM.get(record.fieldId) : undefined,
    seeds: lines.filter((l) => l.recordId === record.id).map((line) => ({ line, seed: seedM.get(line.seedId) })),
    roll: record.rollId ? rollM.get(record.rollId) : undefined,
    combo: record.comboId ? comboM.get(record.comboId) : undefined,
    events: events
      .filter((e) => e.recordId === record.id)
      .map((event) => ({
        event,
        type: typeM.get(event.eventTypeId),
        transplantField: event.transplantFieldId ? fieldM.get(event.transplantFieldId) : undefined,
      })),
  }))
}
