import { useRef, useState } from 'react'

interface Props {
  colCount: number
  onAdd: (title: string) => Promise<void>
}

export default function AddObjectRow({ colCount, onAdd }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function commit() {
    if (value.trim()) {
      await onAdd(value.trim())
    }
    setValue('')
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setValue('')
      setEditing(false)
    }
  }

  return (
    <tr className="group cursor-pointer" onClick={() => !editing && startEdit()}>
      <td className="sticky left-0 border-r border-t border-gray-100 bg-white
                     min-w-[180px] max-w-[240px] px-2 py-1.5">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            placeholder="오브젝트 이름"
            className="w-full text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300"
          />
        ) : (
          <span className="text-sm text-gray-300 group-hover:text-gray-400 select-none">
            + 오브젝트 추가
          </span>
        )}
      </td>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="border-r border-t border-gray-100 w-10 min-w-[2.5rem]" />
      ))}
    </tr>
  )
}
