import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Page } from '../../components/Layout'
import { db } from '../../db/db'
import { exportBackup, importBackup, readBackup, saveBackupFile, summarizeBackup } from '../../lib/backup'
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
      const n = summarizeBackup(backup)
      const from = backup.exportedBy ? `${backup.exportedBy}さんの端末で` : ''
      const ok = confirm(
        `${from}${formatDate(backup.exportedAt)} に書き出したデータです。\n` +
          `播種記録 ${n.records}件・種 ${n.seeds}件・経過 ${n.events}件・写真 ${n.photos}枚\n\n` +
          'この端末のデータに統合します。この端末のデータは消えず、同じ記録は更新日時が新しい方を残します。よろしいですか？',
      )
      if (!ok) return
      const r = await importBackup(backup)
      const parts = [`追加 ${r.added} 件`, `更新 ${r.updated} 件`, `変更なし ${r.skipped} 件`]
      if (r.unified) parts.push(`同じ名前の作物・圃場などを ${r.unified} 件まとめました`)
      setMessage(`${r.mode === 'restore' ? '復元' : '統合'}しました（${parts.join(' / ')}）。`)
      if (r.mode === 'restore') {
        alert('バックアップのデータを復元しました。画面を再読み込みします。')
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
        <h2>読み込み・他の端末と統合</h2>
        <p className="small">
          別の端末で書き出したファイルを読み込むと、この端末のデータに統合します。この端末のデータは消えず、同じ記録は更新日時が新しい方を残します。同じ名前の作物・圃場・ロール・経過の種類は1つにまとめます。
        </p>
        <details className="howto">
          <summary>2台の端末をそろえる手順</summary>
          <ol className="small">
            <li>端末Aで「バックアップを書き出す」→ AirDrop・iCloud Drive・LINE などで端末Bへ送る</li>
            <li>端末Bで「バックアップファイルを選ぶ」→ 統合（Bには A と B の両方の記録がそろう）</li>
            <li>端末Bで書き出し → 端末Aで読み込む（Aにも両方がそろう）</li>
          </ol>
          <p className="muted small">片方で削除・編集した記録も、新しい方としてもう一方に反映されます。</p>
        </details>
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
