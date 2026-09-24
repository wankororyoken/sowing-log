import { useEffect, useState, type FormEvent } from 'react'
import { Page } from '../../components/Layout'
import { db } from '../../db/db'
import { updateSession } from '../../db/init'
import { getSession, updateEntity } from '../../db/repo'

export function SettingsPage() {
  const [userName, setUserName] = useState(getSession().userName)
  const [farmName, setFarmName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void db.farms.get(getSession().farmId).then((f) => setFarmName(f?.name ?? ''))
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await updateSession({ userName: userName.trim() })
    await updateEntity(db.farms, getSession().farmId, { name: farmName.trim() || 'マイ農場' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Page title="設定" back="/more">
      <form className="form" onSubmit={onSubmit}>
        <section className="form-section">
          <label className="field">
            <span>記録者名（この端末の利用者）</span>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="例: 田口" />
          </label>
          <label className="field">
            <span>農場名</span>
            <input value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          </label>
        </section>
        <div className="form-actions">
          <button type="submit" className="btn primary block">
            {saved ? '保存しました' : '保存'}
          </button>
        </div>
      </form>
      <section className="card">
        <h2>データについて</h2>
        <p className="small">
          現在、データはこの端末のブラウザ内に保存されています。共有機能を追加するときに、ここで作ったデータをそのままクラウドへ移せる形で保存しています。
        </p>
        <p className="muted small">端末ID: {getSession().userId.slice(0, 8)}</p>
      </section>
    </Page>
  )
}
