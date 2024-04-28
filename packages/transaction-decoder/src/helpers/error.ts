export function messageFromUnknown(cause: unknown, fallback?: string) {
  if (typeof cause === 'string') {
    return cause
  }
  if (cause instanceof Error) {
    return cause.message
  }
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
    return cause.message
  }
  return fallback ?? 'An unknown error occurred'
}
