import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { RecordCard } from '../../components/RecordCard'
import { loadSummaries, type RecordSummary } from '../../db/records'
import { getAlive } from '../../db/repo'
import { db } from '../../db/db'
import { formatDate } from '../../lib/format'

function groupByYear(rows: RecordSummary[]) {
  const m = new Map<number, RecordSummary[]>()
  for (const r of rows) {
    const y = new Date(r.record.sownAt).getFullYear()
    m.set(y, [...(m.get(y) ?? []), r])
  }
  return [...m.entries()].sort((a, b) => b[0] - a[0])
}

export function History() {
  const [search, setSearch] = useSearchParams()
  const view = search.get('view') === 'date' ? 'date' : 'crop'
  const summaries = useLiveQuery(() => loadSummaries(), [])

  const crops = useMemo(() => {
    const m = new Map<string, { id: string; name: string; kana: string; count: number; last: string }>()
    for (const s of summaries ?? []) {
      const id = s.record.cropId ?? ''
      const cur = m.get(id)
      if (cur) cur.count++
      else m.set(id, { id, name: s.crop?.name ?? '（作物未設定）', kana: s.crop?.kana ?? '', count: 1, last: s.record.sownAt })
    }
    return [...m.values()].sort((a, b) => b.last.localeCompare(a.last))
  }, [summaries])

  return (
    <Page title="履歴">
      <div className="segmented tabs-top">
        <button type="button" className={view === 'crop' ? 'on' : ''} onClick={() => setSearch({}, { replace: true })}>
          作物別
        </button>
        <button type="button" className={view === 'date' ? 'on' : ''} onClick={() => setSearch({ view: 'date' }, { replace: true })}>
          日付順
        </button>
      </div>

      {summaries && summaries.length === 0 ? (
        <Empty>
          まだ播種記録がありません。
          <br />
          下の「記録」から登録してください。
        </Empty>
      ) : view === 'crop' ? (
        <ul className="menu">
          {crops.map((c) => (
            <li key={c.id}>
              <Link to={`/history/crop/${c.id || 'none'}`}>
                <div>
                  <div className="menu-title">{c.name}</div>
                  <div className="menu-sub">
                    {c.count} 件 / 最終 {formatDate(c.last)}
                  </div>
                </div>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        groupByYear(summaries ?? []).map(([year, rows]) => (
          <section key={year}>
            <h2 className="year-heading">{year}年</h2>
            <ul className="card-list">
              {rows.map((s) => (
                <RecordCard key={s.record.id} summary={s} />
              ))}
            </ul>
          </section>
        ))
      )}
    </Page>
  )
}

export function CropHistory() {
  const { cropId } = useParams()
  const id = cropId === 'none' ? null : (cropId ?? null)
  const crop = useLiveQuery(() => getAlive(db.crops, id), [id])
  const summaries = useLiveQuery(() => loadSummaries((r) => (r.cropId ?? null) === id), [id])
  const byYear = groupByYear(summaries ?? [])

  return (
    <Page title={crop?.name ?? '（作物未設定）'} back="/history">
      {summaries && summaries.length === 0 && <Empty>記録がありません。</Empty>}
      {byYear.map(([year, rows]) => (
        <section key={year}>
          <h2 className="year-heading">
            {year}年 <span className="muted">（{rows.length}件）</span>
          </h2>
          <ul className="card-list">
            {rows.map((s) => (
              <RecordCard key={s.record.id} summary={s} showCrop={false} />
            ))}
          </ul>
        </section>
      ))}
    </Page>
  )
}
