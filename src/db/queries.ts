import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { createEntity, getSession, listAlive } from './repo'
import type { Crop } from './types'

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'ja')

export function useCrops() {
  return useLiveQuery(async () => (await listAlive(db.crops)).sort((a, b) => (a.kana || a.name).localeCompare(b.kana || b.name, 'ja')), [])
}

export function useFields() {
  return useLiveQuery(async () => (await listAlive(db.fields)).sort(byName), [])
}

export function useSeeds() {
  return useLiveQuery(async () => (await listAlive(db.seeds)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [])
}

export function useMachines() {
  return useLiveQuery(async () => (await listAlive(db.machines)).sort(byName), [])
}

export function useRolls(machineId?: string) {
  return useLiveQuery(async () => {
    const rolls = (await listAlive(db.rolls)).filter((r) => !machineId || r.machineId === machineId)
    return rolls.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'ja', { numeric: true }))
  }, [machineId])
}

export function useCombos(machineId: string | undefined) {
  return useLiveQuery(async () => {
    if (!machineId) return []
    const rows = await db.sprocketCombos.where('machineId').equals(machineId).filter((r) => !r.deletedAt).toArray()
    return rows.sort((a, b) => a.order - b.order)
  }, [machineId])
}

export function useSpacingEntries(machineId: string | undefined) {
  return useLiveQuery(async () => {
    if (!machineId) return []
    return db.spacingEntries.where('machineId').equals(machineId).filter((r) => !r.deletedAt).toArray()
  }, [machineId])
}

// 作物名から作物を探し、なければ作る（表記ゆれ対策に前後空白・全角半角を正規化）
export async function findOrCreateCrop(rawName: string): Promise<Crop> {
  const name = rawName.normalize('NFKC').trim()
  const farmId = getSession().farmId
  const existing = await db.crops
    .where('name')
    .equals(name)
    .filter((c) => !c.deletedAt && c.farmId === farmId)
    .first()
  if (existing) return existing
  return createEntity(db.crops, { name, kana: '', family: '' })
}
