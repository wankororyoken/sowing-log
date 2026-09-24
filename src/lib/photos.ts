import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { createEntity } from '../db/repo'
import { compressImage } from './image'

export async function savePhoto(file: File): Promise<string> {
  const { blob, width, height } = await compressImage(file)
  const photo = await createEntity(db.photos, { blob, mime: blob.type, width, height })
  return photo.id
}

export function usePhotoUrl(photoId: string | null | undefined): string | null {
  const photo = useLiveQuery(() => (photoId ? db.photos.get(photoId) : undefined), [photoId])
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null)
  const blob = photo && !photo.deletedAt ? photo.blob : null
  useEffect(() => {
    if (!blob) return
    // Blob URL は外部リソースなので、作成と解放を effect で対にする
    const url = URL.createObjectURL(blob)
    // oxlint-disable-next-line react/set-state-in-effect
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  return blob && entry?.blob === blob ? entry.url : null
}
