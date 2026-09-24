import { db } from '../db/db'
import { getSession } from '../db/repo'
import type { BaseEntity } from '../db/types'
import { updateSession } from '../db/init'

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
  const body: BackupFile = { app: 'sowing-log', format: 1, exportedAt: new Date().toISOString(), farmId, tables }
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
  switchedFarm: boolean
}

export async function readBackup(file: File): Promise<BackupFile> {
  const json = JSON.parse(await file.text()) as BackupFile
  if (json.app !== 'sowing-log' || json.format !== 1) throw new Error('播種記録のバックアップファイルではありません')
  return json
}

// 取り込みは id ごとに「更新日時が新しい方を残す」マージ（将来のクラウド同期と同じ考え方）。
export async function importBackup(backup: BackupFile): Promise<ImportResult> {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0, switchedFarm: false }
  // IndexedDB のトランザクション中に fetch などを待つと自動コミットされてしまうため、写真の復元は先に済ませる
  const photos = await Promise.all(
    (backup.tables.photos ?? []).map(async (p) => ({ ...p, blob: await dataUrlToBlob(p.blob as string) })),
  )
  const rowsOf = (name: TableName) => (name === 'photos' ? photos : (backup.tables[name] ?? []))
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
  // 機種変更などで別の農場のバックアップを読み込んだ場合は、その農場に切り替える
  if (backup.farmId !== getSession().farmId) {
    await updateSession({ farmId: backup.farmId })
    result.switchedFarm = true
  }
  return result
}
