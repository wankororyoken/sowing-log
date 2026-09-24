import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'ホーム', icon: '⌂', end: true },
  { to: '/record', label: '記録', icon: '＋', end: false },
  { to: '/history', label: '履歴', icon: '☰', end: false },
  { to: '/seeds', label: '種DB', icon: '◉', end: false },
  { to: '/more', label: 'その他', icon: '⋯', end: false },
]

export function AppLayout() {
  return (
    <div className="app">
      <Outlet />
      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <span className="tab-icon" aria-hidden>
              {t.icon}
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Page({
  title,
  back,
  right,
  children,
}: {
  title: string
  back?: boolean | string
  right?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <>
      <header className="topbar">
        <div className="topbar-side">
          {back && (
            <button
              type="button"
              className="icon-btn"
              aria-label="戻る"
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            >
              ‹
            </button>
          )}
        </div>
        <h1>{title}</h1>
        <div className="topbar-side right">{right}</div>
      </header>
      <main className="content">{children}</main>
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
