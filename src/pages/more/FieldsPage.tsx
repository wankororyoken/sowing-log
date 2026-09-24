import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, Page } from '../../components/Layout'
import { db } from '../../db/db'
import { useFields } from '../../db/queries'
import { createEntity, getAlive, softDelete, updateEntity } from '../../db/repo'
import type { Field, FieldKind, NewEntity } from '../../db/types'
import { FIELD_KIND_LABEL } from '../../domain/labels'
import { numToInput, toNumberOrNull } from '../../lib/format'

export function FieldList() {
  const fields = useFields()
  return (
    <Page
      title="圃場・ハウス"
      back="/more"
      right={
        <Link to="/more/fields/new" className="btn small primary">
          ＋追加
        </Link>
      }
    >
      {fields && fields.length === 0 ? (
        <Empty>圃場が登録されていません。「＋追加」から登録してください。</Empty>
      ) : (
        <ul className="menu">
          {fields?.map((f) => (
            <li key={f.id}>
              <Link to={`/more/fields/${f.id}`}>
                <div>
                  <div className="menu-title">
                    {f.name} <span className="badge">{FIELD_KIND_LABEL[f.kind]}</span>
                  </div>
                  <div className="menu-sub">
                    {[f.areaA != null ? `${f.areaA} a` : '', f.lat != null ? '位置登録済み' : '位置未登録'].filter(Boolean).join(' / ')}
                  </div>
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

export function FieldForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<FieldKind>('open')
  const [area, setArea] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [memo, setMemo] = useState('')
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!id) return
    void getAlive(db.fields, id).then((f) => {
      if (!f) return
      setName(f.name)
      setKind(f.kind)
      setArea(numToInput(f.areaA))
      setLat(numToInput(f.lat))
      setLng(numToInput(f.lng))
      setMemo(f.memo)
    })
  }, [id])

  function locate() {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      alert('この接続では現在地を取得できません（https で開いたときに使えます）。緯度・経度を直接入力してください。')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5))
        setLng(p.coords.longitude.toFixed(5))
        setLocating(false)
      },
      (e) => {
        alert(`現在地を取得できませんでした: ${e.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const data: NewEntity<Field> = {
      name: name.trim(),
      kind,
      areaA: toNumberOrNull(area),
      lat: toNumberOrNull(lat),
      lng: toNumberOrNull(lng),
      memo,
    }
    if (id) await updateEntity(db.fields, id, data)
    else await createEntity(db.fields, data)
    navigate('/more/fields', { replace: true })
  }

  async function remove() {
    if (!id || !confirm('この圃場を削除しますか？')) return
    await softDelete(db.fields, id)
    navigate('/more/fields', { replace: true })
  }

  return (
    <Page title={id ? '圃場の編集' : '圃場の追加'} back="/more/fields">
      <form className="form" onSubmit={onSubmit}>
        <section className="form-section">
          <label className="field">
            <span>名前 *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 北畑A、2号ハウス" required />
          </label>
          <div className="field">
            <span>種類</span>
            <div className="segmented">
              {(Object.keys(FIELD_KIND_LABEL) as FieldKind[]).map((k) => (
                <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                  {FIELD_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>面積（a）</span>
            <input inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
        </section>
        <section className="form-section">
          <h2>位置（気温の自動取得に使います）</h2>
          <div className="grid2">
            <label className="field">
              <span>緯度</span>
              <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="36.12345" />
            </label>
            <label className="field">
              <span>経度</span>
              <input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="138.12345" />
            </label>
          </div>
          <button type="button" className="btn small" onClick={locate} disabled={locating}>
            {locating ? '取得中…' : '📍 現在地を入れる'}
          </button>
        </section>
        <section className="form-section">
          <h2>メモ</h2>
          <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="土質・水はけなど" />
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
