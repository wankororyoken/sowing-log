import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// 入力途中の画面を離れずに別の入力をするための全画面シート
export function Sheet({
  title,
  onClose,
  confirmClose,
  children,
}: {
  title: string
  onClose: () => void
  confirmClose?: string // 指定すると「キャンセル」で閉じる前に確認する（入力内容を失わないため）
  children: ReactNode
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return createPortal(
    // ポータルでも React のイベントは親へ伝わるため、シート内の送信が元の画面のフォームに届かないよう止める
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onSubmit={(e) => e.stopPropagation()}>
      <header className="topbar">
        <div className="topbar-side">
          <button type="button" className="btn small ghost" onClick={() => (!confirmClose || confirm(confirmClose)) && onClose()}>
            キャンセル
          </button>
        </div>
        <h1>{title}</h1>
        <div className="topbar-side right" />
      </header>
      <div className="sheet-body">
        <div className="content">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
