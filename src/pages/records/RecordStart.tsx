import { Link } from 'react-router-dom'
import { Page } from '../../components/Layout'

const options = [
  { method: 'machine', title: '播種機で播く', sub: 'AP-1：ロール・スプロケットから株間を自動表示', icon: '⚙' },
  { method: 'hand', title: '手播き・その他', sub: '点播・すじ播き・ばら播き', icon: '✋' },
  { method: 'nursery', title: '育苗', sub: 'セルトレイ・ポット・育苗箱', icon: '🌱' },
]

export function RecordStart() {
  return (
    <Page title="播種を記録">
      <ul className="start-list">
        {options.map((o) => (
          <li key={o.method}>
            <Link to={`/record/new/${o.method}`} className="start-item">
              <span className="start-icon" aria-hidden>
                {o.icon}
              </span>
              <span>
                <span className="start-title">{o.title}</span>
                <span className="start-sub">{o.sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}
