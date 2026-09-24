import Dexie, { type EntityTable } from 'dexie'
import type {
  Crop,
  EventType,
  Farm,
  Field,
  LocalSetting,
  Machine,
  Photo,
  ProgressEvent,
  Roll,
  Seed,
  SowingRecord,
  SowingSeed,
  SpacingEntry,
  SprocketCombo,
} from './types'

export class SowingDB extends Dexie {
  farms!: EntityTable<Farm, 'id'>
  fields!: EntityTable<Field, 'id'>
  crops!: EntityTable<Crop, 'id'>
  seeds!: EntityTable<Seed, 'id'>
  machines!: EntityTable<Machine, 'id'>
  rolls!: EntityTable<Roll, 'id'>
  sprocketCombos!: EntityTable<SprocketCombo, 'id'>
  spacingEntries!: EntityTable<SpacingEntry, 'id'>
  sowingRecords!: EntityTable<SowingRecord, 'id'>
  sowingSeeds!: EntityTable<SowingSeed, 'id'>
  eventTypes!: EntityTable<EventType, 'id'>
  progressEvents!: EntityTable<ProgressEvent, 'id'>
  photos!: EntityTable<Photo, 'id'>
  local!: EntityTable<LocalSetting, 'key'>

  constructor(name = 'sowing-log') {
    super(name)
    this.version(1).stores({
      farms: 'id, updatedAt',
      fields: 'id, farmId, updatedAt',
      crops: 'id, farmId, name, updatedAt',
      seeds: 'id, farmId, cropId, updatedAt',
      machines: 'id, farmId, updatedAt',
      rolls: 'id, farmId, machineId, updatedAt',
      sprocketCombos: 'id, farmId, machineId, updatedAt',
      spacingEntries: 'id, farmId, machineId, comboId, updatedAt',
      sowingRecords: 'id, farmId, sownAt, fieldId, updatedAt',
      sowingSeeds: 'id, farmId, recordId, seedId, updatedAt',
      eventTypes: 'id, farmId, updatedAt',
      progressEvents: 'id, farmId, recordId, date, updatedAt',
      photos: 'id, farmId, updatedAt',
      local: 'key',
    })
    // v2: 全テーブルを farmId で絞り込めるよう farms にも索引を追加
    this.version(2).stores({
      farms: 'id, farmId, updatedAt',
    })
  }
}

export const db = new SowingDB()
