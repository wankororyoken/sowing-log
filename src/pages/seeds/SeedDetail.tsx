import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { PhotoById } from '../../components/PhotoViewer'
import { db } from '../../db/db'
import { getAlive, softDelete } from '../../db/repo'
import { formatDate } from '../../lib/format'

export function SeedDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const seed = await getAlive(db.seeds, id)
    if (!seed) return null
    const crop = await getAlive(db.crops, seed.cropId)
    const usages = await db.sowingSeeds.where('seedId').equals(seed.id).filter((u) => !u.deletedAt).toArray()
    const records = (await db.sowingRecords.bulkGet(usages.map((u) => u.recordId))).filter((r) => r && !r.deletedAt)
    return { seed, crop, usages, records }
  }, [id])

  if (data === undefined) return <Page title="読み込み中" back="/seeds">{null}</Page>
  if (data === null)
    return (
      <Page title="種" back="/seeds">
        <Empty>この種は見つかりません。</Empty>
      </Page>
    )

  const { seed, crop, usages, records } = data
  const usedBags = usages.reduce((sum, u) => sum + (u.bagFraction ?? 0), 0)

  async function remove() {
    if (!confirm('この種を削除しますか？（播種記録からの参照は残ります）')) return
    await softDelete(db.seeds, seed.id)
    navigate('/seeds', { replace: true })
  }

  const rows: [string, string][] = [
    ['種苗会社', seed.maker],
    ['容量', seed.amountValue != null ? `${seed.amountValue} ${seed.amountUnit}` : ''],
    ['コート', seed.coated ? 'コート種子' : ''],
    ['購入先', seed.supplier],
    ['購入日', seed.purchasedOn ? formatDate(seed.purchasedOn) : ''],
    ['価格', seed.price != null ? `${seed.price.toLocaleString()} 円` : ''],
    ['ロット', seed.lot],
    ['発芽率', seed.germinationRate != null ? `${seed.germinationRate} %` : ''],
    ['有効期限', seed.expiresOn],
  ]

  return (
    <Page
      title={seed.variety || crop?.name || '種'}
      back="/seeds"
      right={
        <Link to={`/seeds/${seed.id}/edit`} className="btn small">
          編集
        </Link>
      }
    >
      <div className="photo-pair">
        <div className="photo-slot">
          <div className="photo-slot-label">表</div>
          <PhotoById photoId={seed.photoFrontId} alt="種袋（表）" />
        </div>
        <div className="photo-slot">
          <div className="photo-slot-label">裏</div>
          <PhotoById photoId={seed.photoBackId} alt="種袋（裏）" />
        </div>
      </div>

      <section className="card">
        <div className="seed-crop">{crop?.name}</div>
        <div className="detail-title">{seed.variety || '（品種未入力）'}</div>
        {seed.finished && <span className="badge muted">使い切り</span>}
        <dl className="kv">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        {seed.memo && <p className="memo">{seed.memo}</p>}
      </section>

      <section className="card">
        <h2>使用状況</h2>
        <p>
          使用済み: 約 <strong>{Math.round(usedBags * 100) / 100}</strong> 袋分
          {usedBags < 1 && usedBags > 0 && `（残り 約${Math.round((1 - usedBags) * 100)}%）`}
        </p>
        {records.length === 0 ? (
          <p className="muted">まだこの種を使った播種記録はありません。</p>
        ) : (
          <ul className="simple-list">
            {records.map((r) => (
              <li key={r!.id}>{formatDate(r!.sownAt)}</li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="btn danger block" onClick={remove}>
        この種を削除
      </button>
    </Page>
  )
}
