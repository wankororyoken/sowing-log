import { Link } from 'react-router-dom'
import { Page } from '../../components/Layout'

const items = [
  { to: '/more/fields', title: '圃場・ハウス', sub: '播種場所・育苗場所の登録' },
  { to: '/more/crops', title: '作物', sub: '作物名・読み・科' },
  { to: '/more/rolls', title: 'ロール', sub: '持っているロール・自作ロールの登録' },
  { to: '/more/machine', title: '播種機（AP-1）', sub: '点播間隔目安表・株間の確認' },
  { to: '/more/backup', title: 'バックアップ', sub: '全データの書き出し・読み込み（iCloud Drive など）' },
  { to: '/more/settings', title: '設定', sub: '記録者名・農場名' },
]

export function MoreMenu() {
  return (
    <Page title="その他">
      <ul className="menu">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to}>
              <div>
                <div className="menu-title">{i.title}</div>
                <div className="menu-sub">{i.sub}</div>
              </div>
              <span aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted small">データはこの端末内だけに保存されています。定期的にバックアップを書き出してください。</p>
    </Page>
  )
}
