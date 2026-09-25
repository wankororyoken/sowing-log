import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { PhotoList } from '../../components/PhotoList'
import { deleteRecord, loadSummaries } from '../../db/records'
import { FIELD_KIND_LABEL } from '../../domain/labels'
import { bagFractionLabel, estimateMachineHoles, estimateNursery, HAND_STYLE_LABEL, METHOD_LABEL } from '../../domain/record'

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
      <KvCard title="気象" rows={weatherRows} />

      {(r.memo || r.photoIds.length > 0) && (
        <section className="card">
          <h2>メモ・写真</h2>
          {r.memo && <p className="memo">{r.memo}</p>}
          <PhotoList photoIds={r.photoIds} />
        </section>
      )}

      <section className="card">
        <h2>経過</h2>
        <p className="muted small">発芽・間引き・定植・収穫などの経過記録は次のステップで追加します。</p>
      </section>

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

function KvCard({ title, rows }: { title: string; rows: [string, string][] }) {
  const shown = rows.filter(([, v]) => v)
  if (!shown.length) return null
  return (
    <section className="card">
      <h2>{title}</h2>
      <dl className="kv">
        {shown.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
