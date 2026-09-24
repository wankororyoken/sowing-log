import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { useCrops, useSeeds } from '../../db/queries'
import type { Seed } from '../../db/types'
import { usePhotoUrl } from '../../lib/photos'

export function SeedList() {
  const seeds = useSeeds()
  const crops = useCrops()
  const [q, setQ] = useState('')
  const [cropId, setCropId] = useState('')
  const [showFinished, setShowFinished] = useState(false)

  const cropName = useMemo(() => new Map(crops?.map((c) => [c.id, c.name])), [crops])

  const filtered = useMemo(() => {
    const words = q.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean)
    return (seeds ?? []).filter((s) => {
      if (!showFinished && s.finished) return false
      if (cropId && s.cropId !== cropId) return false
      const hay = [cropName.get(s.cropId), s.variety, s.maker, s.supplier, s.lot, s.memo].join(' ').normalize('NFKC').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [seeds, q, cropId, showFinished, cropName])

  return (
    <Page
      title="種データベース"
      right={
        <Link to="/seeds/new" className="btn small primary">
          ＋登録
        </Link>
      }
    >
      <div className="filters">
        <input type="search" placeholder="作物・品種・購入先などで検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="filter-row">
          <select value={cropId} onChange={(e) => setCropId(e.target.value)}>
            <option value="">すべての作物</option>
            {crops?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={showFinished} onChange={(e) => setShowFinished(e.target.checked)} />
            使い切りも表示
          </label>
        </div>
      </div>

      {seeds && seeds.length === 0 ? (
        <Empty>
          まだ種が登録されていません。
          <br />
          右上の「＋登録」から種袋を登録してください。
        </Empty>
      ) : (
        <ul className="card-list">
          {filtered.map((s) => (
            <SeedRow key={s.id} seed={s} cropName={cropName.get(s.cropId) ?? '（作物未設定）'} />
          ))}
        </ul>
      )}
    </Page>
  )
}

function SeedRow({ seed, cropName }: { seed: Seed; cropName: string }) {
  const url = usePhotoUrl(seed.photoFrontId)
  return (
    <li>
      <Link to={`/seeds/${seed.id}`} className={`seed-row${seed.finished ? ' finished' : ''}`}>
        <div className="seed-thumb">{url ? <img src={url} alt="" /> : <span>No photo</span>}</div>
        <div className="seed-info">
          <div className="seed-crop">{cropName}</div>
          <div className="seed-variety">{seed.variety || '（品種未入力）'}</div>
          <div className="seed-sub">
            {[seed.maker, seed.amountValue != null ? `${seed.amountValue}${seed.amountUnit}` : '', seed.supplier].filter(Boolean).join(' / ')}
          </div>
          {seed.finished && <span className="badge muted">使い切り</span>}
          {seed.coated && <span className="badge">コート</span>}
        </div>
      </Link>
    </li>
  )
}
