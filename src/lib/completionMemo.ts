const NOTE_ONLY_PREFIX = '__note_only__::'

export function isNoteOnlyMemo(memo: string | null | undefined): boolean {
  return !!memo && memo.startsWith(NOTE_ONLY_PREFIX)
}

export function decodeCompletionMemo(memo: string | null | undefined): string {
  if (!memo) return ''
  return isNoteOnlyMemo(memo) ? memo.slice(NOTE_ONLY_PREFIX.length) : memo
}

export function encodeNoteOnlyMemo(memo: string): string | null {
  const normalized = memo.trim()
  return normalized ? `${NOTE_ONLY_PREFIX}${normalized}` : null
}
