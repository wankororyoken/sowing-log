import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Field, Weather } from '../../db/types'
import { WEATHER_CONDITIONS } from '../../domain/record'
import { fetchWeather, getCurrentPosition, locationKey, type LatLng } from '../../lib/weather'

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ok'; source: string } | { kind: 'error'; message: string }

// 天気は手入力、気温などは圃場の位置（なければ現在地）から自動取得
export function WeatherSection({
  weather,
  setWeather,
  tempInput,
  onTempInput,
  sownAtLocal,
  field,
  recordLoc,
  onRecordLoc,
  initialKey,
}: {
  weather: Weather
  setWeather: Dispatch<SetStateAction<Weather>>
  tempInput: string
  onTempInput: (v: string) => void
  sownAtLocal: string
  field?: Field
  recordLoc: LatLng | null
  onRecordLoc: (loc: LatLng | null) => void
  initialKey: string | null // 読み込み時点で取得済みだった条件（同じなら取り直さない）
}) {
  const fieldLoc = field?.lat != null && field.lng != null ? { lat: field.lat, lng: field.lng } : null
  const loc = fieldLoc ?? recordLoc
  const key = locationKey(loc, sownAtLocal)
  const [fetchedKey, setFetchedKey] = useState<string | null>(initialKey)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function run(target: LatLng, k: string | null, source: string) {
    setStatus({ kind: 'loading' })
    try {
      const auto = await fetchWeather(target.lat, target.lng, new Date(sownAtLocal).toISOString())
      setWeather((cur) => ({ ...cur, ...auto }))
      onTempInput(auto.tempC != null ? String(auto.tempC) : tempInput)
      setFetchedKey(k)
      setStatus({ kind: 'ok', source })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  // 圃場や日時が変わったら自動で取り直す（オフライン時は保存後に自動補完）
  useEffect(() => {
    if (!loc || !key || key === fetchedKey || !navigator.onLine) return
    const t = setTimeout(() => void run(loc, key, fieldLoc ? `${field?.name}の位置` : '記録の位置'), 500)
    return () => clearTimeout(t)
    // 取得条件は key にすべて含まれる（run や loc は毎回作り直されるため依存に入れない）
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchedKey])

  async function fetchHere() {
    setStatus({ kind: 'loading' })
    try {
      const here = await getCurrentPosition()
      onRecordLoc(here)
      await run(here, locationKey(fieldLoc ?? here, sownAtLocal), '現在地')
    } catch (e) {
      setStatus({ kind: 'error', message: `現在地を取得できませんでした: ${(e as Error).message}` })
    }
  }

  const w = weather
  const rows: [string, string][] = [
    ['最高/最低', w.tempMaxC != null && w.tempMinC != null ? `${w.tempMaxC} / ${w.tempMinC} ℃` : ''],
    ['地温', w.soilTempC != null ? `${w.soilTempC} ℃` : ''],
    ['湿度', w.humidity != null ? `${w.humidity} %` : ''],
    ['風速', w.windMs != null ? `${w.windMs} m/s` : ''],
    ['前3日降水', w.precipPrev3dMm != null ? `${w.precipPrev3dMm} mm` : ''],
  ]
  const shown = rows.filter(([, v]) => v)

  return (
    <section className="form-section">
      <h2>気象</h2>
      <div className="chips">
        {WEATHER_CONDITIONS.map((c) => (
          <button type="button" key={c} className={`chip${w.condition === c ? ' on' : ''}`} onClick={() => setWeather({ ...w, condition: w.condition === c ? '' : c })}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid2">
        <label className="field">
          <span>天気（自由入力）</span>
          <input value={w.condition} onChange={(e) => setWeather({ ...w, condition: e.target.value })} />
        </label>
        <label className="field">
          <span>気温（℃）</span>
          <input inputMode="decimal" value={tempInput} onChange={(e) => onTempInput(e.target.value)} placeholder="自動" />
        </label>
      </div>
      {shown.length > 0 && (
        <dl className="kv compact">
          {shown.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="muted small">
        {status.kind === 'loading' && '気象データを取得中…'}
        {status.kind === 'ok' && `${status.source}で自動取得しました（Open-Meteo）。`}
        {status.kind === 'error' && status.message}
        {status.kind === 'idle' &&
          (w.fetchedAt
            ? '自動取得済み（Open-Meteo）。'
            : !loc
              ? '圃場に位置が登録されていません。下のボタンで現在地から取得できます。'
              : !navigator.onLine
                ? 'オフラインです。電波が戻ったら自動で取得します。'
                : '')}
      </p>
      <div className="inline">
        {loc && (
          <button type="button" className="btn small" disabled={status.kind === 'loading'} onClick={() => void run(loc, key, fieldLoc ? `${field?.name}の位置` : '記録の位置')}>
            再取得
          </button>
        )}
        {!fieldLoc && (
          <button type="button" className="btn small" disabled={status.kind === 'loading'} onClick={() => void fetchHere()}>
            📍 現在地で取得
          </button>
        )}
      </div>
    </section>
  )
}
