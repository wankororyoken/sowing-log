import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { PhotoList } from '../../components/PhotoList'
import { useEventTypes } from '../../db/events'
import { deleteRecord, loadSummaries, type RecordSummary } from '../../db/records'
import { FIELD_KIND_LABEL } from '../../domain/labels'
import { bagFractionLabel, daysAfterSowing, estimateMachineHoles, estimateNursery, HAND_STYLE_LABEL, METHOD_LABEL } from '../../domain/record'
import { formatDate } from '../../lib/format'
import { fillWeatherFor } from '../../lib/weatherFill'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const summary = useLiveQuery(async () => (await loadSummaries((r) => r.id === id))[0] ?? null, [id])

  if (summary === undefined) return <Page title="読み込み中" back>{null}</Page>
  if (summary === null)
    return (
      <Page title="記録" back="/history">
        <Empty>この記録は見つかりません。</Empty>
      </Page>
    )

  const r = summary.record
  const w = r.weather
  const cm = (v: number | null) => (v != null ? `${v} cm` : '')

  const settingRows: [string, string][] =
    r.method === 'machine'
      ? [
          ['ロール', summary.roll ? `${summary.roll.name}（${summary.roll.holes}穴）` : ''],
          ['スプロケット', summary.combo ? `ロール側 ${summary.combo.rollTeeth} × 車輪側 ${summary.combo.wheelTeeth}` : ''],
          ['株間', cm(r.spacingCm)],
          ['実測株間', cm(r.measuredSpacingCm)],
          ['畝間', cm(r.rowSpacingCm)],
          ['列数', r.rowCount != null ? `${r.rowCount} 列` : ''],
          ['延長', r.lengthM != null ? `${r.lengthM} m` : ''],
          [
            '推定穴数',
            (() => {
              const n = estimateMachineHoles({
                lengthM: r.lengthM,
                spacingCm: r.measuredSpacingCm ?? r.spacingCm,
                rowCount: r.rowCount,
                rollRows: summary.roll?.rows,
              })
              return n != null ? `約 ${n.toLocaleString()} 穴` : ''
            })(),
          ],
        ]
      : r.method === 'hand'
        ? [
            ['播き方', r.handStyle ? HAND_STYLE_LABEL[r.handStyle] : ''],
            ['株間', cm(r.spacingCm)],
            ['条間', cm(r.rowSpacingCm)],
            ['列数', r.rowCount != null ? `${r.rowCount} 列` : ''],
            ['延長', r.lengthM != null ? `${r.lengthM} m` : ''],
            ['面積', r.areaM2 != null ? `${r.areaM2} ㎡` : ''],
          ]
        : [
            ['容器', r.containerType],
            ['1枚の穴数', r.cellsPerContainer != null ? `${r.cellsPerContainer} 穴` : ''],
            ['枚数', r.containerCount != null ? `${r.containerCount} 枚` : ''],
            ['粒/穴', r.seedsPerCell != null ? `${r.seedsPerCell} 粒` : ''],
            [
              '合計',
              (() => {
                const n = estimateNursery(r)
                return n ? `${n.cells.toLocaleString()} 穴${n.seeds != null ? ` / 約 ${n.seeds.toLocaleString()} 粒` : ''}` : ''
              })(),
            ],
            ['培土', r.soilMix],
          ]

  const weatherRows: [string, string][] = [
    ['天気', w.condition],
    ['気温', w.tempC != null ? `${w.tempC} ℃` : ''],
    ['最高/最低', w.tempMaxC != null && w.tempMinC != null ? `${w.tempMaxC} / ${w.tempMinC} ℃` : ''],
    ['地温', w.soilTempC != null ? `${w.soilTempC} ℃` : ''],
    ['湿度', w.humidity != null ? `${w.humidity} %` : ''],
    ['風速', w.windMs != null ? `${w.windMs} m/s` : ''],
    ['前3日降水', w.precipPrev3dMm != null ? `${w.precipPrev3dMm} mm` : ''],
  ]

  async function remove() {
    if (!confirm('この播種記録を削除しますか？')) return
    await deleteRecord(r.id)
    navigate('/history', { replace: true })
  }

  return (
    <Page
      title={summary.crop?.name ?? '播種記録'}
      back
      right={
        <Link to={`/records/${r.id}/edit`} className="btn small">
          編集
        </Link>
      }
    >
      <section className="card">
        <div className="record-head">
          <span className="record-date">{formatDateTime(r.sownAt)}</span>
          <span className={`badge method-${r.method}`}>{METHOD_LABEL[r.method]}</span>
        </div>
        <div className="detail-title">{summary.crop?.name ?? '（作物未設定）'}</div>
        {summary.field && (
          <div className="muted">
            {summary.field.name}（{FIELD_KIND_LABEL[summary.field.kind]}）
          </div>
        )}
      </section>

      <section className="card">
        <h2>種・播種量</h2>
        {summary.seeds.length === 0 ? (
          <p className="muted small">種袋の登録なし</p>
        ) : (
          <ul className="simple-list">
            {summary.seeds.map(({ line, seed }) => (
              <li key={line.id} className="seed-use">
                {seed ? <Link to={`/seeds/${seed.id}`}>{seed.variety || '（品種未入力）'}</Link> : '（削除された種）'}
                <span className="muted">
                  {[bagFractionLabel(line.bagFraction), line.amountValue != null ? `${line.amountValue}${line.amountUnit}` : ''].filter(Boolean).join(' / ') ||
                    '量の記録なし'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <KvCard title={METHOD_LABEL[r.method] + 'の設定'} rows={settingRows} />
      <KvCard title="気象" rows={weatherRows}>
        <WeatherFetch summary={summary} />
      </KvCard>

      {(r.memo || r.photoIds.length > 0) && (
        <section className="card">
          <h2>メモ・写真</h2>
          {r.memo && <p className="memo">{r.memo}</p>}
          <PhotoList photoIds={r.photoIds} />
        </section>
      )}

      <Timeline summary={summary} />

      <div className="form-actions">
        <Link to={`/record/new/${r.method}?from=${r.id}`} className="btn primary block">
          この設定で新しく記録
        </Link>
        <button type="button" className="btn danger block" onClick={remove}>
          この記録を削除
        </button>
      </div>
    </Page>
  )
}

function KvCard({ title, rows, children }: { title: string; rows: [string, string][]; children?: ReactNode }) {
  const shown = rows.filter(([, v]) => v)
  if (!shown.length && !children) return null
  return (
    <section className="card">
      <h2>{title}</h2>
      {shown.length > 0 && (
        <dl className="kv">
          {shown.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  )
}

function WeatherFetch({ summary }: { summary: RecordSummary }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const r = summary.record
  if (r.weather.fetchedAt) return <p className="muted small">気温などは Open-Meteo から自動取得しました。</p>

  async function run() {
    setState('loading')
    try {
      const ok = await fillWeatherFor(r)
      if (!ok) {
        setState('error')
        setMessage('圃場に位置が登録されていないため取得できません。圃場の位置を登録するか、編集画面で「現在地で取得」を使ってください。')
      } else setState('idle')
    } catch (e) {
      setState('error')
      setMessage((e as Error).message)
    }
  }

  return (
    <div>
      <p className="muted small">{state === 'error' ? message : '気温などはまだ自動取得されていません。'}</p>
      <button type="button" className="btn small" disabled={state === 'loading'} onClick={() => void run()}>
        {state === 'loading' ? '取得中…' : '気象を取得'}
      </button>
    </div>
  )
}

function Timeline({ summary }: { summary: RecordSummary }) {
  const types = useEventTypes()
  const r = summary.record
  return (
    <section className="card">
      <h2>経過</h2>
      <ol className="timeline">
        <li className="timeline-item sown">
          <span className="timeline-day">0日</span>
          <div>
            <div className="timeline-title">
              {formatDate(r.sownAt)} {r.method === 'nursery' ? '育苗播種' : '播種'}
            </div>
          </div>
        </li>
        {summary.events.map(({ event: e, type, transplantField }) => (
          <li key={e.id} className="timeline-item">
            <span className="timeline-day">{daysAfterSowing(r.sownAt, e.date)}日</span>
            <Link to={`/records/${r.id}/events/${e.id}`} className="timeline-body">
              <div className="timeline-title">
                {formatDate(e.date)} <strong>{type?.name ?? '（種類不明）'}</strong> {e.rating}
                {e.value != null && ` ${e.value}${e.valueUnit}`}
              </div>
              {transplantField && <div className="small">定植先: {transplantField.name}</div>}
              {e.memo && <div className="small muted">{e.memo}</div>}
              {e.photoIds.length > 0 && <div className="small muted">📷 {e.photoIds.length}枚</div>}
            </Link>
          </li>
        ))}
      </ol>
      <div className="chips">
        {types?.map((t) => (
          <Link key={t.id} to={`/records/${r.id}/events/new?type=${t.id}`} className="chip">
            ＋{t.name}
          </Link>
        ))}
      </div>
    </section>
  )
}
