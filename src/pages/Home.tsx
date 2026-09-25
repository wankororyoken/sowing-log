import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { RecordCard } from '../components/RecordCard'
import { db } from '../db/db'
import { loadSummaries } from '../db/records'
import { listAlive } from '../db/repo'

export function Home() {
  const counts = useLiveQuery(async () => ({
    seeds: (await listAlive(db.seeds)).filter((s) => !s.finished).length,
    fields: (await listAlive(db.fields)).length,
    rolls: (await listAlive(db.rolls)).length,
    records: (await listAlive(db.sowingRecords)).length,
  }))
  const recent = useLiveQuery(async () => (await loadSummaries()).slice(0, 5))

  const steps = [
    { done: (counts?.fields ?? 0) > 0, to: '/more/fields/new', label: '圃場・ハウスを登録' },
    { done: (counts?.rolls ?? 0) > 0, to: '/more/rolls', label: '持っているロールを登録' },
    { done: (counts?.seeds ?? 0) > 0, to: '/seeds/new', label: '種袋を登録' },
  ]

  return (
    <Page title="播種記録">
      <div className="stats">
        <Link to="/seeds" className="stat">
          <span className="stat-num">{counts?.seeds ?? '–'}</span>
          <span className="stat-label">手持ちの種</span>
        </Link>
        <Link to="/more/fields" className="stat">
          <span className="stat-num">{counts?.fields ?? '–'}</span>
          <span className="stat-label">圃場</span>
        </Link>
        <Link to="/more/rolls" className="stat">
          <span className="stat-num">{counts?.rolls ?? '–'}</span>
          <span className="stat-label">ロール</span>
        </Link>
      </div>

      {steps.some((s) => !s.done) && (
        <section className="card">
          <h2>はじめに</h2>
          <ul className="steps">
            {steps.map((s) => (
              <li key={s.to} className={s.done ? 'done' : ''}>
                <span aria-hidden>{s.done ? '✓' : '○'}</span>
                {s.done ? s.label : <Link to={s.to}>{s.label}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/record" className="btn primary block big-action">
        ＋ 播種を記録
      </Link>

      <div className="section-head">
        <h2>最近の播種記録</h2>
        {recent && recent.length > 0 && <Link to="/history?view=date">すべて見る</Link>}
      </div>
      {recent && recent.length === 0 ? (
        <p className="muted small">まだ記録がありません。</p>
      ) : (
        <ul className="card-list">
          {recent?.map((s) => (
            <RecordCard key={s.record.id} summary={s} />
          ))}
        </ul>
      )}
    </Page>
  )
}

