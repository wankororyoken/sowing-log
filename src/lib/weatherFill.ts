import { db } from '../db/db'
import { getAlive, listAlive, updateEntity } from '../db/repo'
import type { SowingRecord } from '../db/types'
import { fetchWeather } from './weather'

async function locationOf(r: SowingRecord) {
  const f = await getAlive(db.fields, r.fieldId)
  if (f?.lat != null && f.lng != null) return { lat: f.lat, lng: f.lng }
  if (r.lat != null && r.lng != null) return { lat: r.lat, lng: r.lng }
  return null
}

// 1件の記録に気象を入れる。天気（手入力）と手で入れた気温は残す。
export async function fillWeatherFor(r: SowingRecord): Promise<boolean> {
  const loc = await locationOf(r)
  if (!loc) return false
  const auto = await fetchWeather(loc.lat, loc.lng, r.sownAt)
  await updateEntity(db.sowingRecords, r.id, {
    weather: { ...r.weather, ...auto, condition: r.weather.condition, tempC: r.weather.tempC ?? auto.tempC },
  })
  return true
}

let running = false

// 圏外で保存した記録など、気象が未取得のものを電波が戻ったときにまとめて補完する
export async function fillMissingWeather(limit = 20): Promise<number> {
  if (running || !navigator.onLine) return 0
  running = true
  let filled = 0
  try {
    const now = Date.now()
    const targets = (await listAlive(db.sowingRecords))
      .filter((r) => !r.weather.fetchedAt && new Date(r.sownAt).getTime() <= now)
      .slice(0, limit)
    for (const r of targets) {
      try {
        if (await fillWeatherFor(r)) filled++
      } catch {
        // 公開前の日時などは次回に回す
      }
    }
  } finally {
    running = false
  }
  return filled
}

export function startWeatherAutoFill() {
  void fillMissingWeather()
  window.addEventListener('online', () => void fillMissingWeather())
}
