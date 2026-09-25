import { describe, expect, it } from 'vitest'
import { buildWeatherUrl, parseWeather } from './weather'

const hours = (day: string) => Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, '0')}:00`)

describe('気象の自動取得', () => {
  it('直近は予報API、古い日付は過去データAPIを使う', () => {
    const now = new Date(2026, 8, 26, 12)
    expect(buildWeatherUrl(36, 138, new Date(2026, 8, 23, 9), now).url).toContain('api.open-meteo.com/v1/forecast')
    expect(buildWeatherUrl(36, 138, new Date(2025, 3, 20, 9), now).url).toContain('archive-api.open-meteo.com')
    const u = new URL(buildWeatherUrl(36, 138, new Date(2026, 8, 23, 9), now).url)
    expect(u.searchParams.get('start_date')).toBe('2026-09-20')
    expect(u.searchParams.get('end_date')).toBe('2026-09-23')
  })

  it('播種時刻の値・当日の最高最低・前3日の降水量を取り出す', () => {
    const time = [...hours('2026-09-20'), ...hours('2026-09-21'), ...hours('2026-09-22'), ...hours('2026-09-23')]
    const temp = time.map((_, i) => i / 10)
    const json = {
      hourly: { time, temperature_2m: temp, relative_humidity_2m: time.map(() => 80), wind_speed_10m: time.map(() => 1.234), soil_temperature_6cm: time.map(() => 18.26) },
      daily: {
        time: ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'],
        temperature_2m_max: [20, 21, 22, 23.44],
        temperature_2m_min: [10, 11, 12, 13],
        precipitation_sum: [4.2, 6.7, 0.1, 9],
      },
    }
    const w = parseWeather(json, new Date(2026, 8, 23, 9, 40), 'soil_temperature_6cm')
    expect(w.tempC).toBe(8.1) // 3日×24時間 + 9時 = 81番目
    expect(w.humidity).toBe(80)
    expect(w.windMs).toBe(1.2)
    expect(w.soilTempC).toBe(18.3)
    expect(w.tempMaxC).toBe(23.4)
    expect(w.tempMinC).toBe(13)
    expect(w.precipPrev3dMm).toBe(11) // 当日の 9mm は含めない
  })
})
