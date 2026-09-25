import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../../components/Layout'
import { PhotoList } from '../../components/PhotoList'
import { db } from '../../db/db'
import { deleteEvent, saveEvent, useEventTypes } from '../../db/events'
import { useFields } from '../../db/queries'
import { getAlive } from '../../db/repo'
import { FIELD_KIND_LABEL } from '../../domain/labels'
import { daysAfterSowing, EVENT_DEFAULT_UNIT, RATINGS } from '../../domain/record'
import { formatDate, numToInput, todayYmd, toNumberOrNull } from '../../lib/format'

export function EventForm() {
  const { id: recordId, eventId } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const types = useEventTypes()
  const fields = useFields()
  const record = useLiveQuery(() => getAlive(db.sowingRecords, recordId), [recordId])
  const crop = useLiveQuery(() => getAlive(db.crops, record?.cropId), [record?.cropId])

  const [loaded, setLoaded] = useState(!eventId)
  const [date, setDate] = useState(todayYmd())
  const [typeId, setTypeId] = useState(search.get('type') ?? '')
  const [rating, setRating] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [memo, setMemo] = useState('')
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [transplantFieldId, setTransplantFieldId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!eventId) return
    void getAlive(db.progressEvents, eventId).then((e) => {
      if (e) {
        setDate(e.date)
        setTypeId(e.eventTypeId)
        setRating(e.rating)
        setValue(numToInput(e.value))
        setUnit(e.valueUnit)
        setMemo(e.memo)
        setPhotoIds(e.photoIds)
        setTransplantFieldId(e.transplantFieldId ?? '')
      }
      setLoaded(true)
    })
  }, [eventId])

  const type = types?.find((t) => t.id === typeId)
  const isTransplant = type?.name === '定植'
  // 単位を入れていなければ種類ごとの既定値を使う（ホームから種類付きで開いた場合も）
  const defaultUnit = EVENT_DEFAULT_UNIT[type?.name ?? ''] ?? ''
  const days = record ? daysAfterSowing(record.sownAt, date) : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!recordId || !typeId) {
      alert('経過の種類を選んでください')
      return
    }
    setSaving(true)
    try {
      await saveEvent(
        {
          recordId,
          date,
          eventTypeId: typeId,
          rating,
          value: toNumberOrNull(value),
          valueUnit: unit.trim() || (toNumberOrNull(value) != null ? defaultUnit : ''),
          memo,
          photoIds,
          transplantFieldId: isTransplant ? transplantFieldId || null : null,
        },
        eventId,
      )
      navigate(`/records/${recordId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!eventId || !confirm('この経過を削除しますか？')) return
    await deleteEvent(eventId)
    navigate(`/records/${recordId}`, { replace: true })
  }

  if (!loaded || record === undefined) return <Page title="読み込み中" back>{null}</Page>

  return (
    <Page title={eventId ? '経過の編集' : '経過を記録'} back>
      {record && (
        <p className="muted small">
          {crop?.name} / {formatDate(record.sownAt)} 播種
        </p>
      )}
      <form className="form" onSubmit={onSubmit}>
        <section className="form-section">
          <div className="field">
            <span>種類</span>
            <div className="chips">
              {types?.map((t) => (
                <button type="button" key={t.id} className={`chip${typeId === t.id ? ' on' : ''}`} onClick={() => setTypeId(t.id)}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>日付{days != null && days >= 0 && `（播種後 ${days} 日）`}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          {days != null && days < 0 && <p className="small warn">播種日より前の日付になっています。</p>}
        </section>

        {isTransplant && (
          <section className="form-section">
            <h2>定植先</h2>
            <select value={transplantFieldId} onChange={(e) => setTransplantFieldId(e.target.value)}>
              <option value="">（未選択）</option>
              {fields?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}（{FIELD_KIND_LABEL[f.kind]}）
                </option>
              ))}
            </select>
          </section>
        )}

        <section className="form-section">
          <div className="field">
            <span>評価（発芽の揃い・生育など）</span>
            <div className="chips">
              {RATINGS.map((r) => (
                <button type="button" key={r} className={`chip rating${rating === r ? ' on' : ''}`} onClick={() => setRating(rating === r ? '' : r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>数値（発芽率・株数・収量など）</span>
            <div className="inline">
              <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="任意" />
              <input className="unit" list="event-units" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={defaultUnit || '単位'} />
              <datalist id="event-units">
                {['%', '株', '本', 'kg', 'g', 'L', '箱', 'cm'].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>メモ・写真</h2>
          <textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="生育の様子、作業内容など" />
          <PhotoList photoIds={photoIds} onChange={setPhotoIds} />
        </section>

        <div className="form-actions">
          <button type="submit" className="btn primary block" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
          {eventId && (
            <button type="button" className="btn danger block" onClick={remove}>
              削除
            </button>
          )}
        </div>
      </form>
    </Page>
  )
}
