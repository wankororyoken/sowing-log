import { useRef, useState } from 'react'
import { savePhoto, usePhotoUrl } from '../lib/photos'
import { PhotoViewer } from './PhotoViewer'

// 写真1枚分の枠。撮影 or ライブラリから選択し、圧縮して保存した写真IDを返す。
export function PhotoPicker({
  label,
  photoId,
  onChange,
}: {
  label: string
  photoId: string | null
  onChange: (id: string | null) => void
}) {
  const url = usePhotoUrl(photoId)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(false)

  async function handle(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    try {
      onChange(await savePhoto(file))
    } catch (e) {
      alert(`写真を読み込めませんでした: ${(e as Error).message}`)
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (libraryRef.current) libraryRef.current.value = ''
    }
  }

  return (
    <div className="photo-slot">
      <div className="photo-slot-label">{label}</div>
      {url ? (
        <button type="button" className="photo-thumb" onClick={() => setViewing(true)}>
          <img src={url} alt={label} />
        </button>
      ) : (
        <div className="photo-thumb placeholder">{busy ? '処理中…' : '写真なし'}</div>
      )}
      <div className="photo-actions">
        <button type="button" className="btn small" disabled={busy} onClick={() => cameraRef.current?.click()}>
          撮影
        </button>
        <button type="button" className="btn small" disabled={busy} onClick={() => libraryRef.current?.click()}>
          選択
        </button>
        {photoId && (
          <button type="button" className="btn small ghost" onClick={() => onChange(null)}>
            外す
          </button>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handle(e.target.files)} />
      <input ref={libraryRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files)} />
      {viewing && url && <PhotoViewer url={url} alt={label} onClose={() => setViewing(false)} />}
    </div>
  )
}
