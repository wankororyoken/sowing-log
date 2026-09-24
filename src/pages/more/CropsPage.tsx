import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Empty, Page } from '../../components/Layout'
import { db } from '../../db/db'
import { findOrCreateCrop, useCrops } from '../../db/queries'
import { listAlive, softDelete, updateEntity } from '../../db/repo'
import type { Crop } from '../../db/types'

export function CropsPage() {
  const crops = useCrops()
  const seedCount = useLiveQuery(async () => {
    const m = new Map<string, number>()
    for (const s of await listAlive(db.seeds)) m.set(s.cropId, (m.get(s.cropId) ?? 0) + 1)
    return m
  }, [])
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await findOrCreateCrop(newName)
    setNewName('')
  }

  return (
    <Page title="作物" back="/more">
      <form className="add-row" onSubmit={add}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="作物名を追加（例: ダイコン）" />
        <button type="submit" className="btn primary">
          追加
        </button>
      </form>
      <p className="muted small">種の登録時に入力した作物名も自動でここに追加されます。読みを入れると五十音順に並びます。</p>
      {crops && crops.length === 0 ? (
        <Empty>作物がまだありません。</Empty>
      ) : (
        <ul className="menu">
          {crops?.map((c) =>
            editing === c.id ? (
              <li key={c.id}>
                <CropEditor crop={c} used={seedCount?.get(c.id) ?? 0} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={c.id}>
                <button type="button" className="menu-btn" onClick={() => setEditing(c.id)}>
                  <div>
                    <div className="menu-title">{c.name}</div>
                    <div className="menu-sub">{[c.kana, c.family, `種 ${seedCount?.get(c.id) ?? 0}件`].filter(Boolean).join(' / ')}</div>
                  </div>
                  <span aria-hidden>✎</span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Page>
  )
}

function CropEditor({ crop, used, onDone }: { crop: Crop; used: number; onDone: () => void }) {
  const [name, setName] = useState(crop.name)
  const [kana, setKana] = useState(crop.kana)
  const [family, setFamily] = useState(crop.family)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateEntity(db.crops, crop.id, { name: name.normalize('NFKC').trim(), kana: kana.trim(), family: family.trim() })
    onDone()
  }

  async function remove() {
    if (used > 0) {
      alert(`この作物には種が ${used} 件登録されているため削除できません。`)
      return
    }
    if (!confirm(`「${crop.name}」を削除しますか？`)) return
    await softDelete(db.crops, crop.id)
    onDone()
  }

  return (
    <form className="inline-editor" onSubmit={save}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="作物名" />
      <div className="grid2">
        <input value={kana} onChange={(e) => setKana(e.target.value)} placeholder="読み（だいこん）" />
        <input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="科（アブラナ科）" />
      </div>
      <div className="inline">
        <button type="submit" className="btn small primary">
          保存
        </button>
        <button type="button" className="btn small" onClick={onDone}>
          キャンセル
        </button>
        <button type="button" className="btn small danger" onClick={remove}>
          削除
        </button>
      </div>
    </form>
  )
}
