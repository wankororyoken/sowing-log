// 全エンティティ共通のメタ情報。
// 将来クラウド同期・複数人共有を行うため、すべての行に農場ID・作成者・更新日時・論理削除を持たせる。
export interface BaseEntity {
  id: string // UUID
  farmId: string
  createdBy: string
  updatedBy: string
  createdAt: string // ISO 8601
  updatedAt: string
  deletedAt: string | null
}

export type NewEntity<T extends BaseEntity> = Omit<T, keyof BaseEntity>

export interface Farm extends BaseEntity {
  name: string
}

export type FieldKind = 'open' | 'house' | 'nursery'

// 圃場・ハウス・育苗場
export interface Field extends BaseEntity {
  name: string
  kind: FieldKind
  areaA: number | null // 面積（a）
  lat: number | null
  lng: number | null
  memo: string
}

export interface Crop extends BaseEntity {
  name: string
  kana: string
  family: string // 科（アブラナ科など）
}

// 種袋
export interface Seed extends BaseEntity {
  cropId: string
  variety: string // 品種名
  maker: string // 種苗会社
  amountValue: number | null
  amountUnit: string // dL, mL, 粒, g など
  supplier: string // 購入先
  purchasedOn: string // YYYY-MM-DD
  price: number | null
  lot: string
  germinationRate: number | null // %
  expiresOn: string // 有効期限 YYYY-MM or YYYY-MM-DD
  coated: boolean
  photoFrontId: string | null
  photoBackId: string | null
  memo: string
  finished: boolean // 使い切り
}

export interface Machine extends BaseEntity {
  name: string
  maker: string
  model: string
  // 株間 ≒ 係数 ×（ロール側歯数 ÷ 車輪側歯数）÷ 穴数
  spacingCoefficient: number | null
  memo: string
}

export type RollKind = 'plastic' | 'coat' | 'custom'

export interface Roll extends BaseEntity {
  machineId: string
  name: string // A6, Y-12, XL-20-1 など
  holeSpec: string // 穴の大きさの規格（A, Y, XL …）
  holes: number // 1周あたりの穴数（0 = 穴なし）
  rows: number // 列数（コート用ロール。通常 1）
  kind: RollKind
  coatSize: string // コートサイズ（L, 2L, 3L）
  crops: string // 適した作物
  memo: string
  photoId: string | null
  favorite: boolean
}

// スプロケット歯数の組合せ
export interface SprocketCombo extends BaseEntity {
  machineId: string
  rollTeeth: number
  wheelTeeth: number
  order: number
}

// メーカー点播間隔目安表の1セル
export interface SpacingEntry extends BaseEntity {
  machineId: string
  comboId: string
  holes: number
  spacingCm: number
}

export type SowingMethod = 'machine' | 'hand' | 'nursery'
export type HandSowingStyle = 'dibble' | 'drill' | 'broadcast' // 点播・すじ播き・ばら播き

export interface Weather {
  condition: string // 手入力（晴・曇・雨・雪など）
  tempC: number | null
  tempMaxC: number | null
  tempMinC: number | null
  soilTempC: number | null
  humidity: number | null
  windMs: number | null
  precipPrev3dMm: number | null
  fetchedAt: string | null // 自動取得した日時（未取得なら null）
}

export interface SowingRecord extends BaseEntity {
  sownAt: string // ISO 日時
  method: SowingMethod
  // 作物（履歴の集計用）。種袋を選んだ場合はその作物、自家採種など袋がない場合は直接選ぶ
  cropId: string | null
  fieldId: string | null
  weather: Weather
  memo: string
  photoIds: string[]
  // 播種機
  machineId: string | null
  rollId: string | null
  comboId: string | null
  spacingCm: number | null // 記録時点の株間（表の修正に影響されない）
  measuredSpacingCm: number | null // 実測値
  rowSpacingCm: number | null // 畝間・条間
  rowCount: number | null // 列数
  lengthM: number | null // 播種延長
  // 手播き
  handStyle: HandSowingStyle | null
  areaM2: number | null
  // 育苗
  containerType: string // セルトレイ・ポットなど
  cellsPerContainer: number | null
  containerCount: number | null
  seedsPerCell: number | null
  soilMix: string // 培土
}

// 播種記録と種袋の対応（1記録に複数の袋を付けられる）
export interface SowingSeed extends BaseEntity {
  recordId: string
  seedId: string
  // 袋に対するおおよその使用割合（1 = 全部, 0.5 = 半分 …）
  bagFraction: number | null
  amountValue: number | null
  amountUnit: string
}

export interface EventType extends BaseEntity {
  name: string
  order: number
  builtin: boolean
}

// 経過記録
export interface ProgressEvent extends BaseEntity {
  recordId: string
  date: string // YYYY-MM-DD
  eventTypeId: string
  rating: string // ◎○△× など
  value: number | null
  valueUnit: string
  memo: string
  photoIds: string[]
  transplantFieldId: string | null // 定植先
}

export interface Photo extends BaseEntity {
  blob: Blob
  mime: string
  width: number
  height: number
}

// 端末ローカルの設定（同期しない）
export interface LocalSetting {
  key: string
  value: unknown
}

export interface Session {
  userId: string
  userName: string
  farmId: string
}
