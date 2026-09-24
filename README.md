# 播種記録（sowing-log）

播種・育苗・経過の記録と、種袋データベースのためのスマホ向け PWA。
播種機はアグリテクノ矢崎 クリーンシーダ AP-1 に対応（点播間隔目安表を内蔵）。

## 開発

```bash
pnpm install
pnpm dev      # http://localhost:5173 （同じ Wi-Fi の iPhone からは http://<MacのIP>:5173）
pnpm test     # 株間計算・ロール名読み取りのテスト
pnpm build
```

## 公開・利用方法

- `main` に push すると GitHub Actions でビルドし、GitHub Pages（`/sowing-log/`）へ公開する
- iPhone は Safari で公開URLを開き「ホーム画面に追加」→ 以降はホーム画面から起動（オフラインでも動作）
- データはその端末の中だけに保存される（サーバーには送らない）。「その他 → バックアップ」で書き出し・読み込み
- ビルド時の `BASE_PATH` で配信パスを切り替える（GitHub Pages: `/sowing-log/`、Vercel など: 未指定で `/`）

## 構成

- Vite + React + TypeScript、React Router（Hash）
- データ: IndexedDB（Dexie.js）に端末内保存。写真も圧縮して同じ DB に保存
- 全テーブルに `farmId / createdBy / updatedBy / createdAt / updatedAt / deletedAt` を持たせ、
  将来のクラウド同期・複数人共有にそのまま移行できるようにしている（削除は論理削除）
- 初期マスタ（AP-1・スプロケット組合せ・点播間隔目安表・経過の種類）は農場IDから決まる固定IDで登録し、
  複数端末で同期しても重複しない

## ディレクトリ

| パス | 内容 |
|---|---|
| `src/db/` | 型定義・Dexie スキーマ・共通 CRUD・初期データ |
| `src/domain/` | AP-1 メーカーデータ、株間計算、ロール名の読み取り |
| `src/pages/` | 画面（ホーム・種DB・その他のマスタ） |
| `src/components/` | レイアウト・写真入力・株間ピッカー |

## 株間の計算

メーカー表にある穴数（3/4/6/8/10/12/20/30穴）は表の値を使用。
それ以外（自作ロールなど）は `株間 ≒ 係数 × ロール側歯数 ÷ 車輪側歯数 ÷ 穴数`（係数は表から最小二乗で推定、約98.4）。

## 今後の共有（Vercel + Supabase など）への移行方針

- 画面は静的ファイルなので、Vercel では `pnpm build`・出力 `dist` の設定だけで配信できる
- 端末内 DB（IndexedDB）はオフライン用のキャッシュとして残し、クラウド DB と `updatedAt` の新しい方を残す方式で同期する
  （バックアップの読み込みと同じマージ規則）
- `farmId` 単位でメンバーを招待し、`createdBy / updatedBy` をログインユーザーに紐付ける
- 写真は `photos` テーブルの Blob をストレージへアップロードし、行には保存先パスを持たせる
