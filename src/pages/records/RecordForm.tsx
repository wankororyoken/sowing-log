import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Layout'
import { PhotoList } from '../../components/PhotoList'
import { SpacingPicker } from '../../components/SpacingPicker'
import { db } from '../../db/db'
import { findOrCreateCrop, useCombos, useCrops, useFields, useMachines, useRolls, useSpacingEntries } from '../../db/queries'
import { getRecordLines, saveRecord, type SeedLine } from '../../db/records'
import { getAlive, listAlive } from '../../db/repo'
import type { HandSowingStyle, NewEntity, SowingMethod, SowingRecord, Weather } from '../../db/types'
import { FIELD_KIND_LABEL } from '../../domain/labels'
import {
  CONTAINER_PRESETS,
  emptyWeather,
  estimateMachineHoles,
  estimateNursery,
  fromLocalInput,
  HAND_STYLE_LABEL,
  METHOD_LABEL,
  toLocalInput,
} from '../../domain/record'
import { getSpacing } from '../../domain/spacing'
import { numToInput, toNumberOrNull } from '../../lib/format'
import { locationKey, type LatLng } from '../../lib/weather'
import { SeedLinesEditor } from './SeedLinesEditor'
import { WeatherSection } from './WeatherSection'

// 入力中は文字列で持ち、保存時に数値へ変換する
interface Settings {
  fieldId: string
  machineId: string
  rollId: string
  comboId: string
  spacingCm: string
  measuredSpacingCm: string
  rowSpacingCm: string
  rowCount: string
  lengthM: string
  handStyle: HandSowingStyle | ''
  areaM2: string
  containerType: string
  cellsPerContainer: string
  containerCount: string
  seedsPerCell: string
  soilMix: string
}

const emptySettings: Settings = {
  fieldId: '',
  machineId: '',
  rollId: '',
  comboId: '',
  spacingCm: '',
  measuredSpacingCm: '',
  rowSpacingCm: '',
  rowCount: '1',
  lengthM: '',
  handStyle: '',
  areaM2: '',
  containerType: '',
  cellsPerContainer: '',
  containerCount: '',
  seedsPerCell: '',
  soilMix: '',
}

function settingsFrom(r: SowingRecord): Settings {
  return {
    fieldId: r.fieldId ?? '',
    machineId: r.machineId ?? '',
    rollId: r.rollId ?? '',
    comboId: r.comboId ?? '',
    spacingCm: numToInput(r.spacingCm),
    measuredSpacingCm: numToInput(r.measuredSpacingCm),
    rowSpacingCm: numToInput(r.rowSpacingCm),
    rowCount: numToInput(r.rowCount),
    lengthM: numToInput(r.lengthM),
    handStyle: r.handStyle ?? '',
    areaM2: numToInput(r.areaM2),
    containerType: r.containerType,
    cellsPerContainer: numToInput(r.cellsPerContainer),
    containerCount: numToInput(r.containerCount),
    seedsPerCell: numToInput(r.seedsPerCell),
    soilMix: r.soilMix,
  }
}

// 同じ画面のまま URL だけ変わった（別の方法・コピー元）ときに入力状態を持ち越さないよう、URL ごとに作り直す
export function RecordFormPage() {
  const location = useLocation()
  return <RecordForm key={location.pathname + location.search} />
}

function RecordForm() {
  const { id, method: methodParam } = useParams()
  const [search] = useSearchParams()
  const fromId = search.get('from')
  const navigate = useNavigate()

  const [loaded, setLoaded] = useState(!id && !fromId)
  const [method, setMethod] = useState<SowingMethod>((methodParam as SowingMethod) || 'machine')
  const [sownAt, setSownAt] = useState(toLocalInput(new Date().toISOString()))
  const [lines, setLines] = useState<SeedLine[]>([])
  const [cropName, setCropName] = useState('')
  const [s, setS] = useState<Settings>(emptySettings)
  const [weather, setWeather] = useState<Weather>(emptyWeather())
  const [tempInput, setTempInput] = useState('')
  const [memo, setMemo] = useState('')
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null)
  const [recordLoc, setRecordLoc] = useState<LatLng | null>(null)
  const [weatherKey, setWeatherKey] = useState<string | null>(null)

  const fields = useFields()
  const crops = useCrops()
  const machines = useMachines()
  const machineId = s.machineId || machines?.[0]?.id || ''
  const machine = machines?.find((m) => m.id === machineId)
  const rolls = useRolls(machineId || undefined)
  const combos = useCombos(machineId || undefined)
  const entries = useSpacingEntries(machineId || undefined)
  const roll = rolls?.find((r) => r.id === s.rollId)
  const seedsInUse = useLiveQuery(() => db.seeds.bulkGet(lines.map((l) => l.seedId)), [lines])

  // 種袋を選んでいれば作物はそこから決まる
  const cropFromSeeds = seedsInUse?.find((x) => x)?.cropId ?? null
  const cropFromSeedsName = crops?.find((c) => c.id === cropFromSeeds)?.name

  useEffect(() => {
    const srcId = id ?? fromId
    if (!srcId) return
    void (async () => {
      const r = await getAlive(db.sowingRecords, srcId)
      if (!r) {
        setLoaded(true)
        return
      }
      const crop = await getAlive(db.crops, r.cropId)
      setMethod(r.method)
      setS(settingsFrom(r))
      setCropName(crop?.name ?? '')
      if (id) {
        setSownAt(toLocalInput(r.sownAt))
        setLines(
          (await getRecordLines(r.id)).map((l) => ({
            id: l.id,
            seedId: l.seedId,
            bagFraction: l.bagFraction,
            amountValue: l.amountValue,
            amountUnit: l.amountUnit,
          })),
        )
        setWeather(r.weather)
        setTempInput(numToInput(r.weather.tempC))
        const loc = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null
        setRecordLoc(loc)
        if (r.weather.fetchedAt) {
          // 取得済みの条件を覚えておき、開いただけでは取り直さない
          const f = await getAlive(db.fields, r.fieldId)
          const fieldLoc = f?.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : null
          setWeatherKey(locationKey(fieldLoc ?? loc, toLocalInput(r.sownAt)))
        }
        setMemo(r.memo)
        setPhotoIds(r.photoIds)
      } else {
        // 「この設定で新規記録」: 同じ種袋を候補に入れ、播種量・日付・天気は空にする
        setLines((await getRecordLines(r.id)).map((l) => ({ seedId: l.seedId, bagFraction: null, amountValue: null, amountUnit: l.amountUnit })))
      }
      setLoaded(true)
    })()
  }, [id, fromId])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }))

  // 同じ作物・同じ方法の前回記録の設定を呼び出す
  const effectiveCropName = cropFromSeedsName ?? cropName.trim()
  const previous = useLiveQuery(async () => {
    const crop = crops?.find((c) => c.name === effectiveCropName)
    if (!crop) return null
    const rows = (await listAlive(db.sowingRecords)).filter((r) => r.cropId === crop.id && r.method === method && r.id !== id)
    rows.sort((a, b) => b.sownAt.localeCompare(a.sownAt))
    return rows[0] ?? null
  }, [crops, effectiveCropName, method, id])

  function applyPrevious() {
    if (!previous) return
    setS(settingsFrom(previous))
    setCopiedFrom(previous.sownAt)
  }

  function spacingFor(rollHoles: number | undefined, comboId: string): string {
    const combo = combos?.find((c) => c.id === comboId)
    if (!combo || !rollHoles || !entries || !machine) return ''
    const r = getSpacing(combo, rollHoles, entries, machine.spacingCoefficient)
    return r ? String(r.cm) : ''
  }

  function onRollChange(rollId: string) {
    const r = rolls?.find((x) => x.id === rollId)
    setS((p) => ({ ...p, rollId, spacingCm: spacingFor(r?.holes, p.comboId) }))
  }

  const machineHoles = estimateMachineHoles({
    lengthM: toNumberOrNull(s.lengthM),
    spacingCm: toNumberOrNull(s.measuredSpacingCm) ?? toNumberOrNull(s.spacingCm),
    rowCount: toNumberOrNull(s.rowCount),
    rollRows: roll?.rows,
  })
  const nursery = estimateNursery({
    cellsPerContainer: toNumberOrNull(s.cellsPerContainer),
    containerCount: toNumberOrNull(s.containerCount),
    seedsPerCell: toNumberOrNull(s.seedsPerCell),
  })

  const sortedFields = useMemo(() => {
    // 育苗は育苗場・ハウスを、直播は露地・ハウスを上に
    const rank = (k: string) => (method === 'nursery' ? { nursery: 0, house: 1, open: 2 } : { open: 0, house: 1, nursery: 2 })[k] ?? 3
    return [...(fields ?? [])].sort((a, b) => rank(a.kind) - rank(b.kind))
  }, [fields, method])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!cropFromSeeds && !cropName.trim()) {
      alert('種袋を選ぶか、作物名を入力してください')
      return
    }
    setSaving(true)
    try {
      const cropId = cropFromSeeds ?? (await findOrCreateCrop(cropName)).id
      const n = toNumberOrNull
      const isMachine = method === 'machine'
      const isHand = method === 'hand'
      const isNursery = method === 'nursery'
      const data: NewEntity<SowingRecord> = {
        sownAt: fromLocalInput(sownAt),
        method,
        cropId,
        fieldId: s.fieldId || null,
        lat: recordLoc?.lat ?? null,
        lng: recordLoc?.lng ?? null,
        weather: { ...weather, tempC: n(tempInput) },
        memo,
        photoIds,
        machineId: isMachine ? machineId || null : null,
        rollId: isMachine ? s.rollId || null : null,
        comboId: isMachine ? s.comboId || null : null,
        spacingCm: isMachine || isHand ? n(s.spacingCm) : null,
        measuredSpacingCm: isMachine ? n(s.measuredSpacingCm) : null,
        rowSpacingCm: isMachine || isHand ? n(s.rowSpacingCm) : null,
        rowCount: isMachine || isHand ? n(s.rowCount) : null,
        lengthM: isMachine || isHand ? n(s.lengthM) : null,
        handStyle: isHand ? s.handStyle || null : null,
        areaM2: isHand ? n(s.areaM2) : null,
        containerType: isNursery ? s.containerType.trim() : '',
        cellsPerContainer: isNursery ? n(s.cellsPerContainer) : null,
        containerCount: isNursery ? n(s.containerCount) : null,
        seedsPerCell: isNursery ? n(s.seedsPerCell) : null,
        soilMix: isNursery ? s.soilMix.trim() : '',
      }
      const savedId = await saveRecord(data, lines, id)
      navigate(`/records/${savedId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <Page title="読み込み中" back>{null}</Page>

  return (
    <Page title={id ? '記録の編集' : `${METHOD_LABEL[method]}の記録`} back>
      <form className="form" onSubmit={onSubmit}>
        <section className="form-section">
          <div className="segmented">
            {(Object.keys(METHOD_LABEL) as SowingMethod[]).map((m) => (
              <button type="button" key={m} className={method === m ? 'on' : ''} onClick={() => setMethod(m)}>
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="grid2">
            <label className="field">
              <span>日時</span>
              <input type="datetime-local" value={sownAt} onChange={(e) => setSownAt(e.target.value)} required />
            </label>
            <label className="field">
              <span>{method === 'nursery' ? '育苗場所' : '圃場'}</span>
              <select value={s.fieldId} onChange={(e) => set('fieldId', e.target.value)}>
                <option value="">（未選択）</option>
                {sortedFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}（{FIELD_KIND_LABEL[f.kind]}）
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <h2>種</h2>
          <SeedLinesEditor lines={lines} onChange={setLines} defaultCropName={cropName} />
          {cropFromSeedsName ? (
            <p className="small">
              作物: <strong>{cropFromSeedsName}</strong>
            </p>
          ) : (
            <label className="field">
              <span>作物（種袋がない場合）</span>
              <input list="record-crops" value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="例: ダイコン" />
              <datalist id="record-crops">
                {crops?.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
          )}
          {previous && !id && (
            <button type="button" className="btn small" onClick={applyPrevious}>
              ↺ 前回（{new Date(previous.sownAt).toLocaleDateString('ja-JP')}）の設定を使う
            </button>
          )}
          {copiedFrom && <p className="muted small">前回の設定を入れました。必要なところを直してください。</p>}
        </section>

        {method === 'machine' && (
          <section className="form-section">
            <h2>播種機の設定</h2>
            {machines && machines.length > 1 && (
              <label className="field">
                <span>播種機</span>
                <select value={machineId} onChange={(e) => set('machineId', e.target.value)}>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>ロール</span>
              <select value={s.rollId} onChange={(e) => onRollChange(e.target.value)}>
                <option value="">（未選択）</option>
                {rolls?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.favorite ? '★ ' : ''}
                    {r.name}（{r.holes > 0 ? `${r.holes}穴` : '穴なし'}）
                  </option>
                ))}
              </select>
              {rolls && rolls.length === 0 && <span className="small">ロールが未登録です。「その他 → ロール」から登録してください。</span>}
            </label>
            {machine && roll && (
              <div className="field">
                <span>スプロケット（ロール側×車輪側）をタップ</span>
                <SpacingPicker
                  machine={machine}
                  holes={roll.holes}
                  selectedComboId={s.comboId}
                  onSelect={(comboId, cm) => setS((p) => ({ ...p, comboId, spacingCm: String(cm) }))}
                />
              </div>
            )}
            <div className="grid2">
              <div className="field">
                <span>株間（自動）</span>
                <div className="readout">{s.spacingCm ? `${s.spacingCm} cm` : '–'}</div>
              </div>
              <label className="field">
                <span>実測の株間（cm）</span>
                <input inputMode="decimal" value={s.measuredSpacingCm} onChange={(e) => set('measuredSpacingCm', e.target.value)} placeholder="任意" />
              </label>
            </div>
            <RowInputs s={s} set={set} rowLabel="畝間" />
            {machineHoles != null && (
              <p className="estimate">
                推定播種穴数 約 <strong>{machineHoles.toLocaleString()}</strong> 穴
              </p>
            )}
          </section>
        )}

        {method === 'hand' && (
          <section className="form-section">
            <h2>播き方</h2>
            <div className="segmented">
              {(Object.keys(HAND_STYLE_LABEL) as HandSowingStyle[]).map((k) => (
                <button type="button" key={k} className={s.handStyle === k ? 'on' : ''} onClick={() => set('handStyle', s.handStyle === k ? '' : k)}>
                  {HAND_STYLE_LABEL[k]}
                </button>
              ))}
            </div>
            <label className="field">
              <span>株間（cm）</span>
              <input inputMode="decimal" value={s.spacingCm} onChange={(e) => set('spacingCm', e.target.value)} placeholder="任意" />
            </label>
            <RowInputs s={s} set={set} rowLabel="条間" />
            <label className="field">
              <span>面積（㎡）</span>
              <input inputMode="decimal" value={s.areaM2} onChange={(e) => set('areaM2', e.target.value)} placeholder="任意" />
            </label>
          </section>
        )}

        {method === 'nursery' && (
          <section className="form-section">
            <h2>育苗</h2>
            <div className="chips">
              {CONTAINER_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c.label}
                  className={`chip${s.containerType === c.label ? ' on' : ''}`}
                  onClick={() => setS((p) => ({ ...p, containerType: c.label, cellsPerContainer: c.cells != null ? String(c.cells) : p.cellsPerContainer }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span>容器</span>
              <input value={s.containerType} onChange={(e) => set('containerType', e.target.value)} placeholder="例: セルトレイ 128穴" />
            </label>
            <div className="grid3">
              <label className="field">
                <span>1枚の穴数</span>
                <input inputMode="numeric" value={s.cellsPerContainer} onChange={(e) => set('cellsPerContainer', e.target.value)} />
              </label>
              <label className="field">
                <span>枚数</span>
                <input inputMode="decimal" value={s.containerCount} onChange={(e) => set('containerCount', e.target.value)} />
              </label>
              <label className="field">
                <span>粒/穴</span>
                <input inputMode="numeric" value={s.seedsPerCell} onChange={(e) => set('seedsPerCell', e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>培土</span>
              <input value={s.soilMix} onChange={(e) => set('soilMix', e.target.value)} placeholder="例: ○○育苗培土" />
            </label>
            {nursery && (
              <p className="estimate">
                合計 <strong>{nursery.cells.toLocaleString()}</strong> 穴
                {nursery.seeds != null && (
                  <>
                    ／ 約 <strong>{nursery.seeds.toLocaleString()}</strong> 粒
                  </>
                )}
              </p>
            )}
          </section>
        )}

        <WeatherSection
          weather={weather}
          setWeather={setWeather}
          tempInput={tempInput}
          onTempInput={setTempInput}
          sownAtLocal={sownAt}
          field={fields?.find((f) => f.id === s.fieldId)}
          recordLoc={recordLoc}
          onRecordLoc={setRecordLoc}
          initialKey={weatherKey}
        />

        <section className="form-section">
          <h2>メモ・写真</h2>
          <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="土の状態、覆土・鎮圧など" />
          <PhotoList photoIds={photoIds} onChange={setPhotoIds} />
        </section>

        <div className="form-actions">
          <button type="submit" className="btn primary block" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </Page>
  )
}

function RowInputs({ s, set, rowLabel }: { s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void; rowLabel: string }) {
  return (
    <div className="grid3">
      <label className="field">
        <span>{rowLabel}（cm）</span>
        <input inputMode="decimal" value={s.rowSpacingCm} onChange={(e) => set('rowSpacingCm', e.target.value)} />
      </label>
      <label className="field">
        <span>列数</span>
        <input inputMode="numeric" value={s.rowCount} onChange={(e) => set('rowCount', e.target.value)} />
      </label>
      <label className="field">
        <span>延長（m）</span>
        <input inputMode="decimal" value={s.lengthM} onChange={(e) => set('lengthM', e.target.value)} placeholder="任意" />
      </label>
    </div>
  )
}
