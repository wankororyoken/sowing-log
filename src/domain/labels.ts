import type { FieldKind, RollKind } from '../db/types'

export const FIELD_KIND_LABEL: Record<FieldKind, string> = {
  open: '露地',
  house: 'ハウス',
  nursery: '育苗場',
}

export const ROLL_KIND_LABEL: Record<RollKind, string> = {
  plastic: 'プラスチック',
  coat: 'コート用',
  custom: '自作',
}
