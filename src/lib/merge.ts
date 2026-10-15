import { rollNameKey } from '../domain/roll'

// 別の端末（別の農場ID）で記録したデータを、この端末の農場へ取り込める形に書き換える。
//
// - 初期マスタ（AP-1・スプロケット・株間表・経過の種類）は「農場ID:…」の固定IDなので、接頭辞を付け替える
// - 作物・圃場・ロール・経過の種類は、同じ名前のものがこの端末にあればそれに寄せ、参照も付け替える
//   （各端末で別々に作った「ダイコン」が履歴で2つに分かれないようにする）
// - それ以外（種袋・播種記録・経過・写真）は UUID なので、そのまま取り込み「更新日時が新しい方」で突き合わせる

export type Row = Record<string, unknown> & { id: string; farmId: string; deletedAt?: string | null }
export type Tables = Record<string, Row[]>

export interface LocalNames {
  crops: Map<string, string> // 正規化した名前 → この端末のID
  fields: Map<string, string>
  rolls: Map<string, string> // machineId + ロール名キー → ID
  eventTypes: Map<string, string>
}

export interface RemapResult {
  tables: Tables
  unified: number // 同じ名前として1つにまとめた件数
}

// 他の行を指している項目
const REF_KEYS = [
  'cropId',
  'fieldId',
  'transplantFieldId',
  'machineId',
  'rollId',
  'comboId',
  'eventTypeId',
  'seedId',
  'recordId',
  'photoId',
  'photoFrontId',
  'photoBackId',
] as const

export const normalizeName = (s: unknown) => String(s ?? '').normalize('NFKC').trim()

export function rollKey(machineId: unknown, name: unknown) {
  return `${String(machineId)}|${rollNameKey(String(name ?? ''))}`
}

export function remapForFarm(src: Tables, fromFarm: string, toFarm: string, local: LocalNames): RemapResult {
  const prefix = `${fromFarm}:`
  const swapPrefix = (v: string) => (v.startsWith(prefix) ? `${toFarm}:${v.slice(prefix.length)}` : v)

  // 1. 名前が同じものの対応表（旧ID → この端末のID）
  const idMap = new Map<string, string>()
  const dropped = new Set<string>() // この端末側の行を残すため取り込まない行
  const byName = (rows: Row[] | undefined, names: Map<string, string>, keyOf: (r: Row) => string) => {
    for (const r of rows ?? []) {
      const localId = names.get(keyOf(r))
      if (localId && localId !== swapPrefix(r.id)) {
        idMap.set(r.id, localId)
        dropped.add(r.id)
      }
    }
  }
  byName(src.crops, local.crops, (r) => normalizeName(r.name))
  byName(src.fields, local.fields, (r) => normalizeName(r.name))
  byName(src.eventTypes, local.eventTypes, (r) => normalizeName(r.name))
  // ロールは播種機の付け替え後の ID で比べる
  byName(src.rolls, local.rolls, (r) => rollKey(swapPrefix(String(r.machineId)), r.name))

  const mapId = (v: string) => idMap.get(v) ?? swapPrefix(v)

  // 2. 行ごとに農場ID・自分のID・参照を書き換える
  const tables: Tables = {}
  for (const [name, rows] of Object.entries(src)) {
    if (name === 'farms') continue // 農場そのものはこの端末のものを使う
    tables[name] = rows
      .filter((r) => !dropped.has(r.id))
      .map((r) => {
        const out: Row = { ...r, id: mapId(r.id), farmId: toFarm }
        for (const k of REF_KEYS) {
          const v = out[k]
          if (typeof v === 'string') out[k] = mapId(v)
        }
        if (Array.isArray(out.photoIds)) out.photoIds = (out.photoIds as string[]).map(mapId)
        return out
      })
  }
  return { tables, unified: dropped.size }
}
