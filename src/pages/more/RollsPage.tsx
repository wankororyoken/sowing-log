import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { PhotoPicker } from '../../components/PhotoPicker'
import { SpacingPicker } from '../../components/SpacingPicker'
import { db } from '../../db/db'
import { useMachines, useRolls } from '../../db/queries'
import { createEntity, getAlive, softDelete, updateEntity } from '../../db/repo'
import type { NewEntity, Roll, RollKind } from '../../db/types'
import { AP1_CATALOG_ROLLS } from '../../domain/ap1'
import { ROLL_KIND_LABEL } from '../../domain/labels'
import { parseRollName, rollNameKey } from '../../domain/roll'

function rollSummary(r: Roll) {
  return [r.holes > 0 ? `${r.holes}穴` : '穴なし', r.rows > 1 ? `${r.rows}列` : '', r.coatSize ? `コート${r.coatSize}` : '', r.crops]
    .filter(Boolean)
    .join(' / ')
}

export function RollList() {
  const rolls = useRolls()
  return (
    <Page title="ロール" back="/more">
      <div className="button-row">
        <Link to="/more/rolls/new" className="btn primary">
          ＋ ロールを登録
        </Link>
        <Link to="/more/rolls/catalog" className="btn">
          カタログから追加
        </Link>
      </div>
      {rolls && rolls.length === 0 ? (
        <Empty>
          ロールが登録されていません。
          <br />
          持っているロールを登録してください。
        </Empty>
      ) : (
        <ul className="menu">
          {rolls?.map((r) => (
            <li key={r.id}>
              <Link to={`/more/rolls/${r.id}`}>
                <div>
                  <div className="menu-title">
                    {r.favorite && '★ '}
                    {r.name} <span className="badge">{ROLL_KIND_LABEL[r.kind]}</span>
                  </div>
                  <div className="menu-sub">{rollSummary(r)}</div>
                </div>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

interface RollFormState {
  machineId: string
  name: string
  holeSpec: string
  holes: string
  rows: string
  kind: RollKind
  coatSize: string
  crops: string
  memo: string
  photoId: string | null
  favorite: boolean
}

export function RollForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const machines = useMachines()
  const [f, setF] = useState<RollFormState>({
    machineId: '',
    name: '',
    holeSpec: '',
    holes: '',
    rows: '1',
    kind: 'plastic',
    coatSize: '',
    crops: '',
    memo: '',
    photoId: null,
    favorite: true,
  })
  // 名前から自動入力するのは、利用者が規格・穴数を手で直すまで
  const [autoParse, setAutoParse] = useState(!id)

  useEffect(() => {
    if (!id) return
    void getAlive(db.rolls, id).then((r) => {
      if (!r) return
      setF({
        machineId: r.machineId,
        name: r.name,
        holeSpec: r.holeSpec,
        holes: String(r.holes),
        rows: String(r.rows),
        kind: r.kind,
        coatSize: r.coatSize,
        crops: r.crops,
        memo: r.memo,
        photoId: r.photoId,
        favorite: r.favorite,
      })
    })
  }, [id])

  const set = <K extends keyof RollFormState>(k: K, v: RollFormState[K]) => setF((p) => ({ ...p, [k]: v }))

  function onNameChange(name: string) {
    setF((p) => {
      const next = { ...p, name }
      const parsed = autoParse ? parseRollName(name) : null
      if (parsed) {
        next.holeSpec = parsed.holeSpec
        next.holes = String(parsed.holes)
        next.rows = String(parsed.rows)
      }
      return next
    })
  }

  // 播種機が1台だけのときは選ばせずにそれを使う
  const machineId = f.machineId || machines?.[0]?.id || ''
  const machine = machines?.find((m) => m.id === machineId)
  const holes = Number(f.holes)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim() || !machineId) return
    if (!Number.isInteger(holes) || holes < 0) {
      alert('1周の穴数を整数で入力してください')
      return
    }
    const data: NewEntity<Roll> = {
      machineId,
      name: f.name.normalize('NFKC').trim().toUpperCase(),
      holeSpec: f.holeSpec.normalize('NFKC').trim().toUpperCase(),
      holes,
      rows: Math.max(1, Number(f.rows) || 1),
      kind: f.kind,
      coatSize: f.kind === 'coat' ? f.coatSize.trim() : '',
      crops: f.crops.trim(),
      memo: f.memo,
      photoId: f.photoId,
      favorite: f.favorite,
    }
    if (id) await updateEntity(db.rolls, id, data)
    else await createEntity(db.rolls, data)
    navigate('/more/rolls', { replace: true })
  }

  async function remove() {
    if (!id || !confirm('このロールを削除しますか？（過去の播種記録には名前が残ります）')) return
    await softDelete(db.rolls, id)
    navigate('/more/rolls', { replace: true })
  }

  return (
    <Page title={id ? 'ロールの編集' : 'ロールの登録'} back="/more/rolls">
      <form className="form" onSubmit={onSubmit}>
        <section className="form-section">
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
            <span>ロール名 *</span>
            <input value={f.name} onChange={(e) => onNameChange(e.target.value)} placeholder="例: A6、Y-12、XL-20-1" required autoCapitalize="characters" />
          </label>
          <div className="grid3">
            <label className="field">
              <span>穴の規格</span>
              <input
                value={f.holeSpec}
                onChange={(e) => {
                  setAutoParse(false)
                  set('holeSpec', e.target.value)
                }}
                placeholder="A"
              />
            </label>
            <label className="field">
              <span>1周の穴数 *</span>
              <input
                inputMode="numeric"
                value={f.holes}
                onChange={(e) => {
                  setAutoParse(false)
                  set('holes', e.target.value)
                }}
                placeholder="6"
                required
              />
            </label>
            <label className="field">
              <span>列数</span>
              <input
                inputMode="numeric"
                value={f.rows}
                onChange={(e) => {
                  setAutoParse(false)
                  set('rows', e.target.value)
                }}
              />
            </label>
          </div>
          <p className="muted small">ロール名を入れると規格・穴数を自動で読み取ります（A6 → 規格A・6穴）。0穴は穴なしです。</p>
          <div className="field">
            <span>種類</span>
            <div className="segmented">
              {(Object.keys(ROLL_KIND_LABEL) as RollKind[]).map((k) => (
                <button type="button" key={k} className={f.kind === k ? 'on' : ''} onClick={() => set('kind', k)}>
                  {ROLL_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          {f.kind === 'coat' && (
            <label className="field">
              <span>コートサイズ</span>
              <input value={f.coatSize} onChange={(e) => set('coatSize', e.target.value)} placeholder="L / 2L / 3L" />
            </label>
          )}
          <label className="field">
            <span>適した作物</span>
            <input value={f.crops} onChange={(e) => set('crops', e.target.value)} placeholder="例: 大根" />
          </label>
          <label className="check">
            <input type="checkbox" checked={f.favorite} onChange={(e) => set('favorite', e.target.checked)} />
            よく使う（一覧の上に表示）
          </label>
        </section>

        {machine && Number.isInteger(holes) && f.holes !== '' && (
          <section className="form-section">
            <h2>このロールの株間（{machine.name}）</h2>
            <SpacingPicker machine={machine} holes={holes} />
          </section>
        )}

        <section className="form-section">
          <h2>写真・メモ</h2>
          <PhotoPicker label="ロールの写真" photoId={f.photoId} onChange={(v) => set('photoId', v)} />
          <textarea rows={3} value={f.memo} onChange={(e) => set('memo', e.target.value)} placeholder="自作ロールの加工内容など" />
        </section>

        <div className="form-actions">
          <button type="submit" className="btn primary block">
            保存
          </button>
          {id && (
            <button type="button" className="btn danger block" onClick={remove}>
              削除
            </button>
          )}
        </div>
      </form>
    </Page>
  )
}

export function RollCatalog() {
  const navigate = useNavigate()
  const machines = useMachines()
  const rolls = useRolls()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const machine = machines?.find((m) => m.name === 'AP-1') ?? machines?.[0]

  const owned = useMemo(() => new Set(rolls?.filter((r) => r.machineId === machine?.id).map((r) => rollNameKey(r.name))), [rolls, machine])

  function toggle(name: string) {
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })
  }

  async function add() {
    if (!machine) return
    for (const c of AP1_CATALOG_ROLLS.filter((c) => picked.has(c.name))) {
      const parsed = parseRollName(c.name)
      await createEntity(db.rolls, {
        machineId: machine.id,
        name: c.name,
        holeSpec: parsed?.holeSpec ?? '',
        holes: parsed?.holes ?? 0,
        rows: parsed?.rows ?? 1,
        kind: c.kind,
        coatSize: c.coatSize,
        crops: c.crops,
        memo: '',
        photoId: null,
        favorite: true,
      })
    }
    navigate('/more/rolls', { replace: true })
  }

  const groups: { title: string; kind: 'plastic' | 'coat' }[] = [
    { title: 'プラスチック播種ロール', kind: 'plastic' },
    { title: 'コート用播種ロール', kind: 'coat' },
  ]

  return (
    <Page title="カタログから追加" back="/more/rolls">
      <p className="muted small">AP-1 カタログ掲載のロールです。持っているものにチェックを入れて追加してください。</p>
      {groups.map((g) => (
        <section key={g.kind} className="card">
          <h2>{g.title}</h2>
          <ul className="check-list">
            {AP1_CATALOG_ROLLS.filter((c) => c.kind === g.kind).map((c) => {
              const has = owned.has(rollNameKey(c.name))
              return (
                <li key={c.name}>
                  <label className={has ? 'disabled' : ''}>
                    <input type="checkbox" disabled={has} checked={has || picked.has(c.name)} onChange={() => toggle(c.name)} />
                    <strong>{c.name}</strong>
                    <span className="muted">
                      {c.coatSize && `${c.coatSize} / `}
                      {c.crops}
                      {has && '（登録済み）'}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <div className="sticky-actions">
        <button type="button" className="btn primary block" disabled={picked.size === 0} onClick={add}>
          {picked.size} 本を追加
        </button>
      </div>
    </Page>
  )
}
