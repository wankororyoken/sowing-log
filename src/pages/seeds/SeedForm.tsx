import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Layout'
import { PhotoPicker } from '../../components/PhotoPicker'
import { db } from '../../db/db'
import { findOrCreateCrop, useCrops } from '../../db/queries'
import { createEntity, getAlive, updateEntity } from '../../db/repo'
import type { NewEntity, Seed } from '../../db/types'
import { numToInput, toNumberOrNull } from '../../lib/format'

const UNITS = ['dL', 'mL', 'L', '粒', 'g', 'kg', '袋']

interface FormState {
  cropName: string
  variety: string
  maker: string
  amountValue: string
  amountUnit: string
  supplier: string
  purchasedOn: string
  price: string
  lot: string
  germinationRate: string
  expiresOn: string
  coated: boolean
  photoFrontId: string | null
  photoBackId: string | null
  memo: string
  finished: boolean
}

const empty: FormState = {
  cropName: '',
  variety: '',
  maker: '',
  amountValue: '',
  amountUnit: 'dL',
  supplier: '',
  purchasedOn: '',
  price: '',
  lot: '',
  germinationRate: '',
  expiresOn: '',
  coated: false,
  photoFrontId: null,
  photoBackId: null,
  memo: '',
  finished: false,
}

// 種DBの登録・編集ページ
export function SeedForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <Page title={id ? '種の編集' : '種の登録'} back>
      <SeedEditor id={id} onSaved={(seedId) => navigate(`/seeds/${seedId}`, { replace: true })} />
    </Page>
  )
}

// 種袋の入力フォーム本体。播種記録の画面からも開けるようページから切り離している
export function SeedEditor({
  id,
  initialCropName = '',
  onSaved,
}: {
  id?: string
  initialCropName?: string
  onSaved: (seedId: string) => void
}) {
  const crops = useCrops()
  const [f, setF] = useState<FormState>({ ...empty, cropName: initialCropName })
  const [loaded, setLoaded] = useState(!id)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const s = await getAlive(db.seeds, id)
      if (!s) return
      const crop = await getAlive(db.crops, s.cropId)
      setF({
        cropName: crop?.name ?? '',
        variety: s.variety,
        maker: s.maker,
        amountValue: numToInput(s.amountValue),
        amountUnit: s.amountUnit,
        supplier: s.supplier,
        purchasedOn: s.purchasedOn,
        price: numToInput(s.price),
        lot: s.lot,
        germinationRate: numToInput(s.germinationRate),
        expiresOn: s.expiresOn,
        coated: s.coated,
        photoFrontId: s.photoFrontId,
        photoBackId: s.photoBackId,
        memo: s.memo,
        finished: s.finished,
      })
      setLoaded(true)
    })()
  }, [id])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.cropName.trim()) {
      alert('作物名を入力してください')
      return
    }
    setSaving(true)
    try {
      const crop = await findOrCreateCrop(f.cropName)
      const data: NewEntity<Seed> = {
        cropId: crop.id,
        variety: f.variety.trim(),
        maker: f.maker.trim(),
        amountValue: toNumberOrNull(f.amountValue),
        amountUnit: f.amountUnit.trim(),
        supplier: f.supplier.trim(),
        purchasedOn: f.purchasedOn,
        price: toNumberOrNull(f.price),
        lot: f.lot.trim(),
        germinationRate: toNumberOrNull(f.germinationRate),
        expiresOn: f.expiresOn,
        coated: f.coated,
        photoFrontId: f.photoFrontId,
        photoBackId: f.photoBackId,
        memo: f.memo,
        finished: f.finished,
      }
      if (id) {
        await updateEntity(db.seeds, id, data)
        onSaved(id)
      } else {
        onSaved((await createEntity(db.seeds, data)).id)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="muted">読み込み中…</p>

  return (
    <form className="form" onSubmit={onSubmit}>
      <section className="form-section">
        <h2>種袋の写真</h2>
        <div className="photo-pair">
          <PhotoPicker label="表" photoId={f.photoFrontId} onChange={(v) => set('photoFrontId', v)} />
          <PhotoPicker label="裏" photoId={f.photoBackId} onChange={(v) => set('photoBackId', v)} />
        </div>
      </section>

      <section className="form-section">
        <h2>基本情報</h2>
        <label className="field">
          <span>作物名 *</span>
          <input list="crop-names" value={f.cropName} onChange={(e) => set('cropName', e.target.value)} placeholder="例: ダイコン" required />
          <datalist id="crop-names">
            {crops?.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>品種名</span>
          <input value={f.variety} onChange={(e) => set('variety', e.target.value)} placeholder="例: 耐病総太り" />
        </label>
        <label className="field">
          <span>種苗会社</span>
          <input value={f.maker} onChange={(e) => set('maker', e.target.value)} placeholder="例: タキイ種苗" />
        </label>
        <div className="field">
          <span>容量</span>
          <div className="inline">
            <input inputMode="decimal" value={f.amountValue} onChange={(e) => set('amountValue', e.target.value)} placeholder="2" />
            <select value={f.amountUnit} onChange={(e) => set('amountUnit', e.target.value)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.coated} onChange={(e) => set('coated', e.target.checked)} />
          コート種子（ペレット）
        </label>
      </section>

      <section className="form-section">
        <h2>購入情報</h2>
        <label className="field">
          <span>購入先</span>
          <input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="例: ○○種苗店" />
        </label>
        <div className="grid2">
          <label className="field">
            <span>購入日</span>
            <input type="date" value={f.purchasedOn} onChange={(e) => set('purchasedOn', e.target.value)} />
          </label>
          <label className="field">
            <span>価格（円）</span>
            <input inputMode="numeric" value={f.price} onChange={(e) => set('price', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>袋の表示</h2>
        <label className="field">
          <span>ロット番号</span>
          <input value={f.lot} onChange={(e) => set('lot', e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>発芽率（%）</span>
            <input inputMode="decimal" value={f.germinationRate} onChange={(e) => set('germinationRate', e.target.value)} placeholder="85" />
          </label>
          <label className="field">
            <span>有効期限</span>
            <input type="month" value={f.expiresOn} onChange={(e) => set('expiresOn', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>メモ</h2>
        <textarea rows={3} value={f.memo} onChange={(e) => set('memo', e.target.value)} placeholder="まき時・特徴など" />
        {id && (
          <label className="check">
            <input type="checkbox" checked={f.finished} onChange={(e) => set('finished', e.target.checked)} />
            使い切った（一覧で非表示にする）
          </label>
        )}
      </section>

      <div className="form-actions">
        <button type="submit" className="btn primary block" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}
