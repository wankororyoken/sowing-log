// アグリテクノ矢崎 クリーンシーダ AP-1 のメーカー公表データ
// 出典: https://agritechno.co.jp/product/seeds/contents000039.html（点播間隔目安表・対応種子とそのオプション）
// 表の注記: 土質や速度により間隔が変わる場合があります。

// スプロケット歯数の組合せ（ロール側, 車輪側）。表の左から順。
export const AP1_COMBOS: ReadonlyArray<readonly [number, number]> = [
  [14, 9],
  [14, 10],
  [13, 10],
  [13, 11],
  [11, 10],
  [11, 11],
  [10, 11],
  [11, 13],
  [10, 13],
  [10, 14],
  [9, 14],
]

// 点播間隔目安表（cm）。キー = 繰出ロール穴数、値 = 上の組合せ順の株間。
export const AP1_SPACING_TABLE: Readonly<Record<number, readonly number[]>> = {
  3: [51, 46, 43, 39, 36, 33, 30, 28, 25, 23, 21],
  4: [38, 35, 32, 29, 27, 25, 23, 21, 19, 18, 16],
  6: [26, 23, 21, 19, 18, 16, 15, 14, 13, 12, 11],
  8: [19, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8],
  10: [15, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6],
  12: [13, 12, 11, 10, 9, 8, 7, 7, 6, 6, 5],
  20: [8, 7, 7, 6, 6, 5, 5, 4, 4, 4, 3],
  30: [5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2],
}

export interface CatalogRoll {
  name: string
  kind: 'plastic' | 'coat'
  coatSize: string
  crops: string
}

// カタログ掲載ロール（「カタログから追加」用。持っているものだけ登録してもらう）
export const AP1_CATALOG_ROLLS: readonly CatalogRoll[] = [
  { name: 'Y-6', kind: 'plastic', coatSize: '', crops: '蕪・高菜' },
  { name: 'Y-12', kind: 'plastic', coatSize: '', crops: '小蕪・チンゲン菜・小松菜' },
  { name: 'X-12', kind: 'plastic', coatSize: '', crops: 'しそ' },
  { name: 'M-3', kind: 'plastic', coatSize: '', crops: '白菜・キャベツ' },
  { name: 'M-12', kind: 'plastic', coatSize: '', crops: '人参・パセリ' },
  { name: 'X-6', kind: 'plastic', coatSize: '', crops: '野沢菜' },
  { name: 'L-12', kind: 'plastic', coatSize: '', crops: 'ねぎ・玉ねぎ・法蓮草・春菊' },
  { name: 'Q-4', kind: 'plastic', coatSize: '', crops: '大根' },
  { name: 'Q-12', kind: 'plastic', coatSize: '', crops: 'ニラ' },
  { name: 'R-12', kind: 'plastic', coatSize: '', crops: 'ソルゴー' },
  { name: 'G-12', kind: 'plastic', coatSize: '', crops: 'みつば' },
  { name: 'C-6', kind: 'plastic', coatSize: '', crops: 'ナットウ大豆' },
  { name: 'C-12', kind: 'plastic', coatSize: '', crops: '小麦・そば' },
  { name: 'AA-6', kind: 'plastic', coatSize: '', crops: '稲' },
  { name: 'AA-12', kind: 'plastic', coatSize: '', crops: '大麦・芽出法蓮草' },
  { name: 'N-6', kind: 'plastic', coatSize: '', crops: '小豆' },
  { name: 'S-4', kind: 'plastic', coatSize: '', crops: '大豆・スイートコーン' },
  { name: 'YY-12', kind: 'plastic', coatSize: '', crops: '水菜' },
  { name: 'Z', kind: 'plastic', coatSize: '', crops: '穴なし' },
  { name: 'ML-20-1', kind: 'coat', coatSize: 'L', crops: '人参' },
  { name: 'XL-3-3', kind: 'coat', coatSize: 'L', crops: '白菜・キャベツ・レタス・ブロッコリー・カリフラワー' },
  { name: 'XL-20-1', kind: 'coat', coatSize: 'L', crops: '蕪・小蕪・中国野菜' },
  { name: 'XL-8-1', kind: 'coat', coatSize: 'L', crops: '野沢菜' },
  { name: 'S2L-16-1', kind: 'coat', coatSize: '2L', crops: '法蓮草' },
  { name: '2L-20-1', kind: 'coat', coatSize: '2L', crops: '玉ねぎ' },
  { name: '2L-30-1', kind: 'coat', coatSize: '2L', crops: 'ねぎ' },
  { name: 'R3-4-1', kind: 'coat', coatSize: '3L', crops: '大根' },
]
