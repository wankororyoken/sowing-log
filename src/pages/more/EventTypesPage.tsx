import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Page } from '../../components/Layout'
import { db } from '../../db/db'
import { useEventTypes } from '../../db/events'
import { createEntity, listAlive, softDelete, updateEntity } from '../../db/repo'
import type { EventType } from '../../db/types'

export function EventTypesPage() {
  const types = useEventTypes()
  const usage = useLiveQuery(async () => {
    const m = new Map<string, number>()
    for (const e of await listAlive(db.progressEvents)) m.set(e.eventTypeId, (m.get(e.eventTypeId) ?? 0) + 1)
    return m
  }, [])
  const [name, setName] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    const n = name.normalize('NFKC').trim()
    if (!n || types?.some((t) => t.name === n)) return
    await createEntity(db.eventTypes, { name: n, order: (types?.at(-1)?.order ?? 0) + 1, builtin: false })
    setName('')
  }

  async function move(t: EventType, dir: -1 | 1) {
    if (!types) return
    const i = types.findIndex((x) => x.id === t.id)
    const other = types[i + dir]
    if (!other) return
    await updateEntity(db.eventTypes, t.id, { order: other.order })
    await updateEntity(db.eventTypes, other.id, { order: t.order })
  }

  async function rename(t: EventType) {
    const n = prompt('新しい名前', t.name)?.normalize('NFKC').trim()
    if (n && n !== t.name) await updateEntity(db.eventTypes, t.id, { name: n })
  }

  async function remove(t: EventType) {
    const used = usage?.get(t.id) ?? 0
    if (used > 0) {
      alert(`「${t.name}」は ${used} 件の経過で使われているため削除できません。`)
      return
    }
    if (confirm(`「${t.name}」を削除しますか？`)) await softDelete(db.eventTypes, t.id)
  }

  return (
    <Page title="経過の種類" back="/more">
      <form className="add-row" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="種類を追加（例: 摘心）" />
        <button type="submit" className="btn primary">
          追加
        </button>
      </form>
      <p className="muted small">「発芽」「定植」は一覧の日数表示・定植先に使うため、名前を変えないでください。</p>
      <ul className="menu">
        {types?.map((t, i) => (
          <li key={t.id} className="type-row">
            <span className="menu-title">{t.name}</span>
            <span className="muted small">{usage?.get(t.id) ?? 0}件</span>
            <span className="type-actions">
              <button type="button" className="btn small ghost" disabled={i === 0} onClick={() => void move(t, -1)} aria-label="上へ">
                ↑
              </button>
              <button type="button" className="btn small ghost" disabled={i === types.length - 1} onClick={() => void move(t, 1)} aria-label="下へ">
                ↓
              </button>
              {!t.builtin && (
                <button type="button" className="btn small ghost" onClick={() => void rename(t)}>
                  名前
                </button>
              )}
              {!t.builtin && (
                <button type="button" className="btn small ghost" onClick={() => void remove(t)}>
                  削除
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Page>
  )
}
