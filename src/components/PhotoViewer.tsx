import { useState } from 'react'
import { usePhotoUrl } from '../lib/photos'

// 全画面表示。画像タップで等倍 ⇔ 拡大を切り替え、拡大中はスクロールで細部を読める。
export function PhotoViewer({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(false)
  return (
    <div className="viewer" role="dialog" aria-label={alt}>
      <div className="viewer-bar">
        <span>{alt}</span>
        <span className="viewer-hint">{zoom ? 'タップで全体表示' : 'タップで拡大'}</span>
        <button type="button" className="icon-btn light" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={`viewer-body${zoom ? ' zoomed' : ''}`}>
        <img src={url} alt={alt} onClick={() => setZoom((z) => !z)} />
      </div>
    </div>
  )
}

export function PhotoById({ photoId, alt, className }: { photoId: string | null; alt: string; className?: string }) {
  const url = usePhotoUrl(photoId)
  const [viewing, setViewing] = useState(false)
  if (!url) return <div className={`photo-thumb placeholder ${className ?? ''}`}>写真なし</div>
  return (
    <>
      <button type="button" className={`photo-thumb ${className ?? ''}`} onClick={() => setViewing(true)}>
        <img src={url} alt={alt} />
      </button>
      {viewing && <PhotoViewer url={url} alt={alt} onClose={() => setViewing(false)} />}
    </>
  )
}
