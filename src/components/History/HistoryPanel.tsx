import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { AppObject, ObjectClosureReview } from '../../types'

interface Props {
  objects: AppObject[]
  reviews: ObjectClosureReview[]
  onDeleteHistory: (id: string) => Promise<boolean>
  onClose: () => void
}

function formatClosedAt(value: string | null) {
  if (!value) return '-'
  return format(parseISO(value), 'yyyy년 M월 d일')
}

export default function HistoryPanel({ objects, reviews, onDeleteHistory, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(objects[0]?.id ?? null)
  const selected = objects.find(o => o.id === selectedId) ?? objects[0]
  const selectedReview = selected ? reviews.find(r => r.object_id === selected.id) : undefined
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!selected) return
    if (!window.confirm(`"${selected.title}" 히스토리를 삭제할까요?`)) return

    setDeleting(true)
    setError(null)
    const succeeded = await onDeleteHistory(selected.id)
    setDeleting(false)
    if (!succeeded) {
      setError('히스토리를 삭제하지 못했습니다. 권한과 정책을 확인해 주세요.')
      return
    }

    const nextObjects = objects.filter(o => o.id !== selected.id)
    if (nextObjects.length === 0) {
      onClose()
      return
    }
    setSelectedId(nextObjects[0].id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 h-[70vh] flex flex-col">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">히스토리</h2>
            <p className="text-xs text-gray-400 mt-1">마친 오브젝트와 남겨둔 리뷰를 다시 봅니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {objects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            아직 마친 오브젝트가 없습니다.
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            <div className="w-64 border-r border-gray-100 overflow-y-auto">
              {objects.map(obj => {
                const review = reviews.find(r => r.object_id === obj.id)
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedId(obj.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50
                                ${selected?.id === obj.id ? 'bg-blue-50/60' : ''}`}
                  >
                    <span className="block text-sm font-medium text-gray-700 truncate">{obj.title}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{formatClosedAt(obj.closed_at)}</span>
                    {review && (
                      <span className="block text-xs text-gray-400 mt-1 truncate">{review.review}</span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selected && (
                <>
                  <p className="text-xs text-gray-400 mb-1">{formatClosedAt(selected.closed_at)}</p>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">{selected.title}</h3>

                  {selected.ref_url && (
                    <div className="mb-5">
                      <p className="text-xs text-gray-400 font-medium mb-1">레퍼런스</p>
                      {selected.ref_type === 'url' ? (
                        <a
                          href={selected.ref_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-500 hover:text-blue-700 break-all"
                        >
                          {selected.ref_url}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500 break-all">{selected.ref_url}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">리뷰</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                      {selectedReview?.review ?? '리뷰가 없습니다.'}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={handleDelete}
                      disabled={!selected || deleting}
                      className="text-xs text-red-300 hover:text-red-500 disabled:opacity-50"
                    >
                      {deleting ? '삭제 중...' : '히스토리 삭제'}
                    </button>
                  </div>
                  {error && (
                    <p className="mt-4 text-xs text-red-400">{error}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
