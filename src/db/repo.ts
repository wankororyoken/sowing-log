import type { EntityTable } from 'dexie'
import { newId } from '../lib/id'
import { db } from './db'
import type { BaseEntity, NewEntity, Session } from './types'

let session: Session | null = null

export function getSession(): Session {
  if (!session) throw new Error('session not initialized')
  return session
}

export function setSession(s: Session) {
  session = s
}

const now = () => new Date().toISOString()

export function makeMeta(id = newId()): BaseEntity {
  const s = getSession()
  const t = now()
  return { id, farmId: s.farmId, createdBy: s.userId, updatedBy: s.userId, createdAt: t, updatedAt: t, deletedAt: null }
}

export async function createEntity<T extends BaseEntity>(table: EntityTable<T, 'id'>, data: NewEntity<T>, id?: string): Promise<T> {
  const row = { ...data, ...makeMeta(id) } as T
  await table.add(row)
  return row
}

export async function updateEntity<T extends BaseEntity>(
  table: EntityTable<T, 'id'>,
  id: string,
  patch: Partial<NewEntity<T>>,
): Promise<void> {
  const s = getSession()
  // Dexie の汎用型（IDType / UpdateSpec）はジェネリクスのままだと解決できないため never で渡す
  await table.update(id as never, { ...patch, updatedBy: s.userId, updatedAt: now() } as never)
}

// 共有時の誤削除から戻せるよう、物理削除はせず deletedAt を立てる
export async function softDelete<T extends BaseEntity>(table: EntityTable<T, 'id'>, id: string): Promise<void> {
  const s = getSession()
  const t = now()
  await table.update(id as never, { deletedAt: t, updatedAt: t, updatedBy: s.userId } as never)
}

export async function listAlive<T extends BaseEntity>(table: EntityTable<T, 'id'>): Promise<T[]> {
  return table.where('farmId').equals(getSession().farmId).filter((r) => !r.deletedAt).toArray()
}

export async function getAlive<T extends BaseEntity>(table: EntityTable<T, 'id'>, id: string | null | undefined): Promise<T | undefined> {
  if (!id) return undefined
  const row = await table.get(id as never)
  return row && !row.deletedAt ? row : undefined
}

export { db }
