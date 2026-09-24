import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Page } from '../../components/Layout'
import { db } from '../../db/db'
import { exportBackup, importBackup, readBackup, saveBackupFile } from '../../lib/backup'
import { formatDate } from '../../lib/format'

const LAST_BACKUP_KEY = 'lastBackupAt'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lastBackup = useLiveQuery(async () => (await db.local.get(LAST_BACKUP_KEY))?.value as string | undefined)
  const persisted = useLiveQuery(async () => (navigator.storage?.persisted ? navigator.storage.persisted() : false))

  async function onExport() {
    setBusy(true)
    setMessage('')
    try {
      const file = await exportBackup()
      const r = await saveBackupFile(file)
      if (r === 'cancelled') return
      await db.local.put({ key: LAST_BACKUP_KEY, value: new Date().toISOString() })
      setMessage(`${file.name}（${Math.round(file.size / 1024)} KB）を書き出しました。`)
    } catch (e) {
      setMessage(`書き出しに失敗しました: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function onImport(files: FileList | null) {
    const file = files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const backup = await readBackup(file)
      if (!confirm(`${formatDate(backup.exportedAt)} のバックアップを読み込みます。同じデータは新しい方を残します。よろしいですか？`)) return
      const r = await importBackup(backup)
      setMessage(`読み込みました（追加 ${r.added} 件 / 更新 ${r.updated} 件 / 変更なし ${r.skipped} 件）。`)
      if (r.switchedFarm) {
        alert('バックアップの農場に切り替えました。画面を再読み込みします。')
        location.reload()
      }
    } catch (e) {
      setMessage(`読み込みに失敗しました: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="バックアップ" back="/more">
      <section className="card">
        <h2>書き出し</h2>
        <p className="small">
          種・写真・記録などすべてのデータを1つのファイルに書き出します。iPhone では共有メニューの「"ファイル"に保存」から iCloud Drive
          を選んでください。
        </p>
        <p className="muted small">前回の書き出し: {lastBackup ? formatDate(lastBackup) : 'まだありません'}</p>
        <button type="button" className="btn primary block" disabled={busy} onClick={onExport}>
          {busy ? '処理中…' : 'バックアップを書き出す'}
        </button>
      </section>

      <section className="card">
        <h2>読み込み</h2>
        <p className="small">機種変更したときや、別の端末にデータを移すときに使います。今あるデータは消えず、同じデータは更新日時が新しい方を残します。</p>
        <button type="button" className="btn block" disabled={busy} onClick={() => fileRef.current?.click()}>
          バックアップファイルを選ぶ
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files)} />
      </section>

      {message && <p className="notice">{message}</p>}

      <section className="card">
        <h2>保存状態</h2>
        <p className="small">
          {persisted
            ? 'この端末ではデータが自動で消されないよう保護されています。'
            : 'データの保護が有効になっていません。iPhone ではホーム画面に追加したアプリから使うと保護されます。'}
        </p>
      </section>
    </Page>
  )
}
