export const NOTE_MAX_LENGTH = 80

export function sanitizeNote(value) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, NOTE_MAX_LENGTH)
}
