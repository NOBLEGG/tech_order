import { useRef, useState } from 'react'

interface Props {
  onCreate: (title: string, description?: string) => Promise<void>
  onClose: () => void
}

export default function CreateObjectModal({ onCreate, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  async function handleCreate() {
    const trimmed = title.trim()
    if (!trimmed || saving) return
    setSaving(true)
    await onCreate(trimmed, description.trim() || undefined)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">새 오브젝트</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <input
            ref={titleRef}
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="오브젝트 이름"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none
                       focus:border-blue-300 placeholder-gray-300"
          />
          <label className="block">
            <span className="block text-xs text-gray-400 font-medium mb-1.5">설명</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="이 오브젝트가 무엇을 위한 것인지 적어두세요 (선택)"
              className="w-full h-24 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2
                         outline-none focus:border-blue-300 placeholder-gray-300"
            />
          </label>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="text-sm text-blue-500 hover:text-blue-700 font-medium
                       disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? '만드는 중...' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}
