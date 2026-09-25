import type { Weather } from '../db/types'

// Open-Meteo（無料・APIキー不要）から、播種日時・場所の気象を取得する。
// 直近は予報API（過去約3か月まで遡れる）、それより前は過去データAPI（ERA5 再解析）を使う。

const FORECAST = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive'
const RECENT_DAYS = 85

export type AutoWeather = Omit<Weather, 'condition'>

export interface LatLng {
  lat: number
  lng: number
}

// 取得条件（位置と時刻）のキー。時刻は1時間単位で見れば十分（分を変えても取り直さない）
export function locationKey(loc: LatLng | null, sownAtLocal: string): string | null {
  return loc ? `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}@${sownAtLocal.slice(0, 13)}` : null
}

interface OpenMeteoResponse {
  hourly: { time: string[] } & Record<string, unknown>
  daily: { time: string[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[] }
}

const pad = (n: number) => String(n).padStart(2, '0')

// 端末の現地時刻（日本）での日付文字列
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function buildWeatherUrl(lat: number, lng: number, at: Date, now = new Date()): { url: string; soilKey: string } {
  const recent = (now.getTime() - at.getTime()) / 86_400_000 <= RECENT_DAYS
  const soilKey = recent ? 'soil_temperature_6cm' : 'soil_temperature_0_to_7cm'
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', soilKey].join(','),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Tokyo',
    start_date: ymd(addDays(at, -3)),
    end_date: ymd(at),
  })
  return { url: `${recent ? FORECAST : ARCHIVE}?${params}`, soilKey }
}

const round1 = (v: number | null | undefined) => (v == null ? null : Math.round(v * 10) / 10)

// 応答から、播種時刻に最も近い1時間値と、当日の最高/最低、前3日の降水量合計を取り出す
export function parseWeather(json: OpenMeteoResponse, at: Date, soilKey: string): AutoWeather {
  const target = `${ymd(at)}T${pad(at.getHours())}:00`
  const i = json.hourly.time.indexOf(target)
  const pick = (k: string) => (i >= 0 ? round1((json.hourly[k] as (number | null)[] | undefined)?.[i]) : null)
  const day = json.daily.time.indexOf(ymd(at))
  const prev = json.daily.time
    .map((t, j) => ({ t, p: json.daily.precipitation_sum[j] }))
    .filter(({ t }) => t < ymd(at))
    .slice(-3)
  const prevValues = prev.map((x) => x.p).filter((p): p is number => p != null)
  return {
    tempC: pick('temperature_2m'),
    humidity: pick('relative_humidity_2m'),
    windMs: pick('wind_speed_10m'),
    soilTempC: pick(soilKey),
    tempMaxC: day >= 0 ? round1(json.daily.temperature_2m_max[day]) : null,
    tempMinC: day >= 0 ? round1(json.daily.temperature_2m_min[day]) : null,
    precipPrev3dMm: prevValues.length ? round1(prevValues.reduce((a, b) => a + b, 0)) : null,
    fetchedAt: new Date().toISOString(),
  }
}

export async function fetchWeather(lat: number, lng: number, atIso: string): Promise<AutoWeather> {
  const at = new Date(atIso)
  if (at.getTime() > Date.now() + 86_400_000) throw new Error('未来の日時の気象は取得できません')
  const { url, soilKey } = buildWeatherUrl(lat, lng, at)
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null
    throw new Error(body?.reason ?? `気象データを取得できませんでした（${res.status}）`)
  }
  const w = parseWeather((await res.json()) as OpenMeteoResponse, at, soilKey)
  if (w.tempC == null && w.tempMaxC == null) throw new Error('この日時の気象データはまだ公開されていません')
  return w
}

// 端末の現在地（https でのみ使える）
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      reject(new Error('この接続では現在地を取得できません'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message)),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60_000 },
    )
  })
}
