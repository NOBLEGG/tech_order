import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { AppObject, ReferenceType } from '../../types'

interface Props {
  object: AppObject
  onUpdate: (id: string, patch: Partial<AppObject>) => Promise<void>
}

export default function ReferenceSection({ object, onUpdate }: Props) {
  const { user } = useAuth()
  const [mode, setMode] = useState<ReferenceType>(object.ref_type ?? 'url')
  const [urlInput, setUrlInput] = useState(object.ref_type === 'url' ? (object.ref_url ?? '') : '')
  const [uploading, setUploading] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 파일 레퍼런스일 때 Signed URL 생성
  useEffect(() => {
    if (object.ref_type !== 'file' || !object.ref_url) { setSignedUrl(null); return }
    supabase.storage.from('ref')
      .createSignedUrl(object.ref_url, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null))
  }, [object.ref_url, object.ref_type])

  const hasRef = !!object.ref_url
  const fileName = object.ref_url?.split('/').pop()

  async function saveUrl() {
    const url = urlInput.trim()
    if (!url) return
    await onUpdate(object.id, { ref_url: url, ref_type: 'url' })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)

    // 경로만 저장 (signed URL은 런타임에 생성)
    const path = `${user.id}/${object.id}/${file.name}`
    const { error } = await supabase.storage.from('ref').upload(path, file, { upsert: true })
    if (error) { console.error('upload error:', error); setUploading(false); return }

    await onUpdate(object.id, { ref_url: path, ref_type: 'file' })
    setUploading(false)
  }

  async function clearRef() {
    if (object.ref_type === 'file' && object.ref_url) {
      await supabase.storage.from('ref').remove([object.ref_url])
    }
    await onUpdate(object.id, { ref_url: null, ref_type: null })
    setUrlInput('')
    setSignedUrl(null)
  }

  return (
    <div className="border-t border-gray-100 pt-3 mt-1">
      <p className="text-xs text-gray-400 font-medium mb-2">레퍼런스</p>

      {hasRef ? (
        <div className="flex items-center gap-2">
          {object.ref_type === 'url' ? (
            <a href={object.ref_url!} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 flex-1 min-w-0">
              <LinkIcon />
              <span className="truncate">{object.ref_url}</span>
            </a>
          ) : (
            signedUrl ? (
              <a href={signedUrl} target="_blank" rel="noreferrer"
                 className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 flex-1 min-w-0">
                <FileIcon />
                <span className="truncate">{fileName}</span>
              </a>
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <FileIcon />
                {fileName}
              </span>
            )
          )}
          <button onClick={clearRef} className="text-gray-300 hover:text-red-400 flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            {(['url', 'file'] as ReferenceType[]).map(t => (
              <button key={t} onClick={() => setMode(t)}
                      className={`text-xs px-2 py-0.5 rounded transition-colors
                        ${mode === t ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
                {t === 'url' ? '링크' : '파일'}
              </button>
            ))}
          </div>

          {mode === 'url' ? (
            <div className="flex items-center gap-2">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveUrl()}
                placeholder="https://..."
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none
                           focus:border-blue-300"
              />
              <button onClick={saveUrl}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium flex-shrink-0">
                저장
              </button>
            </div>
          ) : (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs border border-dashed border-gray-300 rounded px-3 py-1.5
                           text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors
                           disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : '파일 선택'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" className="flex-shrink-0">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" className="flex-shrink-0">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}
