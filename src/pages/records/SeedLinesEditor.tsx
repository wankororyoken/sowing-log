import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { useCrops, useSeeds } from '../../db/queries'
import type { SeedLine } from '../../db/records'
import type { Seed } from '../../db/types'
import { BAG_FRACTIONS } from '../../domain/record'
import { toNumberOrNull } from '../../lib/format'
import { usePhotoUrl } from '../../lib/photos'
import { SeedEditor } from '../seeds/SeedForm'

// 播種に使った種袋と、袋に対するおおよその使用量
export function SeedLinesEditor({
  lines,
  onChange,
  defaultCropName = '',
}: {
  lines: SeedLine[]
  onChange: (lines: SeedLine[]) => void
  defaultCropName?: string // 新規登録するときの作物名の初期値
}) {
  const seeds = useSeeds()
  const crops = useCrops()
  const [picking, setPicking] = useState(lines.length === 0)
  const [q, setQ] = useState('')
  const [registering, setRegistering] = useState(false)
  const cropName = useMemo(() => new Map(crops?.map((c) => [c.id, c.name])), [crops])
  const seedById = useMemo(() => new Map(seeds?.map((s) => [s.id, s])), [seeds])

  const candidates = useMemo(() => {
    const words = q.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean)
    const chosen = new Set(lines.map((l) => l.seedId))
    return (seeds ?? []).filter((s) => {
      if (s.finished || chosen.has(s.id)) return false
      const hay = [cropName.get(s.cropId), s.variety, s.maker, s.supplier].join(' ').normalize('NFKC').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [seeds, q, lines, cropName])

  function addSeed(seedId: string) {
    onChange([...lines, { seedId, bagFraction: null, amountValue: null, amountUnit: 'mL' }])
    setPicking(false)
    setQ('')
  }

  function update(i: number, patch: Partial<SeedLine>) {
    onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  return (
    <div className="seed-lines">
      {lines.map((l, i) => {
        const seed = seedById.get(l.seedId)
        const isPreset = BAG_FRACTIONS.some((f) => l.bagFraction != null && Math.abs(f.value - l.bagFraction) < 0.001)
        return (
          <div key={l.id ?? l.seedId} className="seed-line">
            <div className="seed-line-head">
              <SeedMini seed={seed} cropName={seed ? cropName.get(seed.cropId) : undefined} />
              <button type="button" className="btn small ghost" onClick={() => onChange(lines.filter((_, j) => j !== i))}>
                外す
              </button>
            </div>
            <div className="field">
              <span>播種量（袋に対してだいたい）</span>
              <div className="chips">
                {BAG_FRACTIONS.map((f) => (
                  <button
                    type="button"
                    key={f.label}
                    className={`chip${l.bagFraction != null && Math.abs(f.value - l.bagFraction) < 0.001 ? ' on' : ''}`}
                    onClick={() => update(i, { bagFraction: l.bagFraction === f.value ? null : f.value })}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="inline small">
                <span className="muted">その他</span>
                <input
                  className="narrow"
                  inputMode="numeric"
                  placeholder="%"
                  value={l.bagFraction != null && !isPreset ? String(Math.round(l.bagFraction * 100)) : ''}
                  onChange={(e) => {
                    const n = toNumberOrNull(e.target.value)
                    update(i, { bagFraction: n == null ? null : n / 100 })
                  }}
                />
                <span className="muted">%</span>
                <span className="muted">／ 量</span>
                <input
                  className="narrow"
                  inputMode="decimal"
                  value={l.amountValue ?? ''}
                  onChange={(e) => update(i, { amountValue: toNumberOrNull(e.target.value) })}
                />
                <select className="narrow" value={l.amountUnit} onChange={(e) => update(i, { amountUnit: e.target.value })}>
                  {['mL', 'dL', '粒', 'g'].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      })}

      {picking ? (
        <div className="seed-picker">
          <input type="search" placeholder="種DBから検索（作物・品種）" value={q} onChange={(e) => setQ(e.target.value)} />
          {seeds && seeds.length === 0 && <p className="muted small">種DBに種が登録されていません。下のボタンから登録するか、種袋がない場合は「作物」だけ入力してください。</p>}
          <ul className="seed-picker-list">
            {candidates.slice(0, 30).map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => addSeed(s.id)}>
                  <SeedMini seed={s} cropName={cropName.get(s.cropId)} />
                </button>
              </li>
            ))}
          </ul>
          <div className="inline">
            <button type="button" className="btn small" onClick={() => setRegistering(true)}>
              ＋ 新しい種袋を登録
            </button>
            {lines.length > 0 && (
              <button type="button" className="btn small ghost" onClick={() => setPicking(false)}>
                閉じる
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" className="btn small" onClick={() => setPicking(true)}>
          ＋ 種袋を{lines.length ? 'さらに' : ''}追加
        </button>
      )}

      {registering && (
        <Sheet title="種の登録" onClose={() => setRegistering(false)}>
          <SeedEditor
            initialCropName={defaultCropName}
            onSaved={(seedId) => {
              addSeed(seedId)
              setRegistering(false)
            }}
          />
        </Sheet>
      )}
    </div>
  )
}

function SeedMini({ seed, cropName }: { seed?: Seed; cropName?: string }) {
  const url = usePhotoUrl(seed?.photoFrontId)
  return (
    <div className="seed-mini">
      <div className="seed-mini-thumb">{url && <img src={url} alt="" />}</div>
      <div>
        <div className="seed-crop">{cropName ?? ''}</div>
        <div className="seed-variety">{seed?.variety || '（品種未入力）'}</div>
        <div className="seed-sub">{[seed?.maker, seed?.lot && `ロット ${seed.lot}`].filter(Boolean).join(' / ')}</div>
      </div>
    </div>
  )
}
