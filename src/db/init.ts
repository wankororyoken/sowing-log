import { AP1_COMBOS, AP1_SPACING_TABLE } from '../domain/ap1'
import { estimateCoefficient } from '../domain/spacing'
import { newId } from '../lib/id'
import { db } from './db'
import { createEntity, setSession } from './repo'
import type { Session } from './types'

const SESSION_KEY = 'session'
const SEED_VERSION_KEY = 'seedVersion'
const SEED_VERSION = 1

export const DEFAULT_EVENT_TYPES = ['発芽', '間引き', '定植', '追肥', '防除', '潅水', '観察', '収穫', 'その他']

// 端末の利用者と農場を用意する。
// ログイン機能ができるまでは端末ごとに利用者IDを発行し、共有開始時にアカウントへ紐付ける。
export async function initApp(): Promise<Session> {
  let session = (await db.local.get(SESSION_KEY))?.value as Session | undefined
  if (!session) {
    const t = new Date().toISOString()
    const userId = newId()
    const farmId = newId()
    session = { userId, userName: '', farmId }
    await db.transaction('rw', db.farms, db.local, async () => {
      await db.farms.add({
        id: farmId,
        farmId,
        name: 'マイ農場',
        createdBy: userId,
        updatedBy: userId,
        createdAt: t,
        updatedAt: t,
        deletedAt: null,
      })
      await db.local.put({ key: SESSION_KEY, value: session })
    })
  }
  setSession(session)
  await seedMasters(session.farmId)
  // ブラウザの容量整理でデータが消されないよう永続化を依頼（ホーム画面の PWA では許可されやすい）
  void navigator.storage?.persist?.().catch(() => false)
  return session
}

export async function updateSession(patch: Partial<Session>): Promise<Session> {
  const cur = (await db.local.get(SESSION_KEY))?.value as Session
  const next = { ...cur, ...patch }
  await db.local.put({ key: SESSION_KEY, value: next })
  setSession(next)
  return next
}

// 初期マスタ（AP-1 と点播間隔目安表、経過の種類）。
// 他の端末と同期したときに重複しないよう、農場IDから決まる固定IDで登録する。
async function seedMasters(farmId: string) {
  const key = `${SEED_VERSION_KEY}:${farmId}`
  const done = (await db.local.get(key))?.value as number | undefined
  if (done && done >= SEED_VERSION) return

  const machineId = `${farmId}:ap1`
  const combos = AP1_COMBOS.map(([rollTeeth, wheelTeeth], i) => ({
    id: `${machineId}:combo:${rollTeeth}-${wheelTeeth}`,
    rollTeeth,
    wheelTeeth,
    order: i,
  }))
  const entries = Object.entries(AP1_SPACING_TABLE).flatMap(([holes, row]) =>
    row.map((spacingCm, i) => ({
      id: `${combos[i].id}:h${holes}`,
      comboId: combos[i].id,
      holes: Number(holes),
      spacingCm,
    })),
  )
  const coefficient = Math.round((estimateCoefficient(combos, entries) ?? 98.4) * 10) / 10

  await db.transaction('rw', [db.machines, db.sprocketCombos, db.spacingEntries, db.eventTypes, db.local], async () => {
    if (!(await db.machines.get(machineId))) {
      await createEntity(
        db.machines,
        {
          name: 'AP-1',
          maker: 'アグリテクノ矢崎',
          model: 'クリーンシーダ AP-1',
          spacingCoefficient: coefficient,
          memo: 'メーカー点播間隔目安表を登録済み。土質や速度により間隔が変わる場合があります。',
        },
        machineId,
      )
    }
    for (const c of combos) {
      if (!(await db.sprocketCombos.get(c.id))) {
        await createEntity(db.sprocketCombos, { machineId, rollTeeth: c.rollTeeth, wheelTeeth: c.wheelTeeth, order: c.order }, c.id)
      }
    }
    for (const e of entries) {
      if (!(await db.spacingEntries.get(e.id))) {
        await createEntity(db.spacingEntries, { machineId, comboId: e.comboId, holes: e.holes, spacingCm: e.spacingCm }, e.id)
      }
    }
    for (const [i, name] of DEFAULT_EVENT_TYPES.entries()) {
      const id = `${farmId}:event:${name}`
      if (!(await db.eventTypes.get(id))) {
        await createEntity(db.eventTypes, { name, order: i, builtin: true }, id)
      }
    }
    await db.local.put({ key, value: SEED_VERSION })
  })
}
