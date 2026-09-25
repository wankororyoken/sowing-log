import { useRef, useState } from 'react'
import { savePhoto } from '../lib/photos'
import { PhotoById } from './PhotoViewer'

// 複数枚の写真（現場写真など）
export function PhotoList({ photoIds, onChange }: { photoIds: string[]; onChange?: (ids: string[]) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handle(files: FileList | null) {
    if (!files?.length || !onChange) return
    setBusy(true)
    try {
      const ids: string[] = []
      for (const f of Array.from(files)) ids.push(await savePhoto(f))
      onChange([...photoIds, ...ids])
    } catch (e) {
      alert(`写真を読み込めませんでした: ${(e as Error).message}`)
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (libraryRef.current) libraryRef.current.value = ''
    }
  }

  return (
    <div>
      {photoIds.length > 0 && (
        <div className="photo-grid">
          {photoIds.map((id, i) => (
            <div key={id} className="photo-grid-item">
              <PhotoById photoId={id} alt={`写真 ${i + 1}`} className="square" />
              {onChange && (
                <button type="button" className="photo-remove" aria-label="外す" onClick={() => onChange(photoIds.filter((x) => x !== id))}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {onChange && (
        <div className="photo-actions">
          <button type="button" className="btn small" disabled={busy} onClick={() => cameraRef.current?.click()}>
            {busy ? '処理中…' : '📷 撮影'}
          </button>
          <button type="button" className="btn small" disabled={busy} onClick={() => libraryRef.current?.click()}>
            ライブラリから
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handle(e.target.files)} />
          <input ref={libraryRef} type="file" accept="image/*" multiple hidden onChange={(e) => handle(e.target.files)} />
        </div>
      )}
    </div>
  )
}
