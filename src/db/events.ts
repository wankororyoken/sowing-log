import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { createEntity, listAlive, softDelete, updateEntity } from './repo'
import type { NewEntity, ProgressEvent } from './types'

export function useEventTypes() {
  return useLiveQuery(async () => (await listAlive(db.eventTypes)).sort((a, b) => a.order - b.order), [])
}

export async function saveEvent(data: NewEntity<ProgressEvent>, id?: string): Promise<string> {
  if (id) {
    await updateEntity(db.progressEvents, id, data)
    return id
  }
  return (await createEntity(db.progressEvents, data)).id
}

export async function deleteEvent(id: string) {
  await softDelete(db.progressEvents, id)
}
