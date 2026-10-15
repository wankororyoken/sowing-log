import { db } from '../db/db'
import { updateSession } from '../db/init'
import { getSession, listAlive } from '../db/repo'
import type { BaseEntity } from '../db/types'
import { normalizeName, remapForFarm, rollKey, type LocalNames, type Row, type Tables } from './merge'

// 同期対象のテーブル（local は端末ごとの設定なので含めない）
const TABLES = [
  'farms',
  'fields',
  'crops',
  'seeds',
  'machines',
  'rolls',
  'sprocketCombos',
  'spacingEntries',
  'sowingRecords',
  'sowingSeeds',
  'eventTypes',
  'progressEvents',
  'photos',
] as const
type TableName = (typeof TABLES)[number]

interface BackupFile {
  app: 'sowing-log'
  format: 1
  exportedAt: string
  farmId: string
  exportedBy?: string // 書き出した端末の記録者名
  tables: Partial<Record<TableName, Record<string, unknown>[]>>
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

export async function exportBackup(): Promise<File> {
  const farmId = getSession().farmId
  const tables: BackupFile['tables'] = {}
  for (const name of TABLES) {
    const rows = (await db.table(name).where('farmId').equals(farmId).toArray()) as Record<string, unknown>[]
    if (name === 'photos') {
      tables[name] = await Promise.all(rows.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob as Blob) })))
    } else {
      tables[name] = rows
    }
  }
  const body: BackupFile = {
    app: 'sowing-log',
    format: 1,
    exportedAt: new Date().toISOString(),
    farmId,
    exportedBy: getSession().userName,
    tables,
  }
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const name = `sowing-log-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
  return new File([JSON.stringify(body)], name, { type: 'application/json' })
}

// iPhone では共有シートから「ファイルに保存」→ iCloud Drive を選べる。使えない環境ではダウンロード。
export async function saveBackupFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
  unified: number // 同じ名前の作物・圃場などを1つにまとめた件数
  mode: 'same' | 'merge' | 'restore'
}

export async function readBackup(file: File): Promise<BackupFile> {
  const json = JSON.parse(await file.text()) as BackupFile
  if (json.app !== 'sowing-log' || json.format !== 1) throw new Error('播種記録のバックアップファイルではありません')
  return json
}

// 取り込み前の確認用（削除済みを除いた件数）
export function summarizeBackup(b: BackupFile) {
  const count = (t: TableName) => (b.tables[t] ?? []).filter((r) => !r.deletedAt).length
  return { records: count('sowingRecords'), seeds: count('seeds'), events: count('progressEvents'), photos: count('photos') }
}

// この農場の削除されていない行（テーブル名で引く汎用版）
async function aliveRows(t: TableName): Promise<Row[]> {
  return (await db.table(t).where('farmId').equals(getSession().farmId).toArray()).filter((r: Row) => !r.deletedAt)
}

// この端末に、まだ利用者が入力したデータがあるか（初期マスタだけなら「空」）
async function hasOwnData(): Promise<boolean> {
  for (const t of ['sowingRecords', 'seeds', 'fields', 'crops', 'rolls'] as const) {
    if ((await aliveRows(t)).length > 0) return true
  }
  return false
}

async function localNames(): Promise<LocalNames> {
  const names = async (t: TableName) => new Map((await aliveRows(t)).map((r) => [normalizeName(r.name), r.id]))
  return {
    crops: await names('crops'),
    fields: await names('fields'),
    eventTypes: await names('eventTypes'),
    rolls: new Map((await listAlive(db.rolls)).map((r) => [rollKey(r.machineId, r.name), r.id])),
  }
}

// 取り込みのしかた
//  - 同じ農場（自分のバックアップ）: そのまま突き合わせる
//  - この端末が空（機種変更など）: バックアップの農場に切り替えて復元する
//  - 別の端末で記録したデータ: この端末の農場に書き換えて統合する（同じ名前の作物・圃場などは1つにまとめる）
// いずれも id ごとに「更新日時が新しい方を残す」（将来のクラウド同期と同じ考え方）。
export async function importBackup(backup: BackupFile): Promise<ImportResult> {
  const localFarm = getSession().farmId
  const mode: ImportResult['mode'] = backup.farmId === localFarm ? 'same' : (await hasOwnData()) ? 'merge' : 'restore'
  const result: ImportResult = { added: 0, updated: 0, skipped: 0, unified: 0, mode }

  let tables = backup.tables as Tables
  if (mode === 'merge') {
    const remapped = remapForFarm(tables, backup.farmId, localFarm, await localNames())
    tables = remapped.tables
    result.unified = remapped.unified
  }

  // IndexedDB のトランザクション中に fetch などを待つと自動コミットされてしまうため、写真の復元は先に済ませる
  const photos = await Promise.all((tables.photos ?? []).map(async (p) => ({ ...p, blob: await dataUrlToBlob(p.blob as string) })))
  const rowsOf = (name: TableName): Row[] => (name === 'photos' ? photos : (tables[name] ?? []))
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      const table = db.table(name)
      for (const row of rowsOf(name)) {
        const incoming = row as unknown as BaseEntity
        const existing = (await table.get(incoming.id)) as BaseEntity | undefined
        if (!existing) {
          await table.add(row)
          result.added++
        } else if (incoming.updatedAt > existing.updatedAt) {
          await table.put(row)
          result.updated++
        } else {
          result.skipped++
        }
      }
    }
  })
  if (mode === 'restore') await updateSession({ farmId: backup.farmId })
  return result
}
