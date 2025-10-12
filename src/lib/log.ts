export function logInfo(msg: string, meta?: any) {
  // eslint-disable-next-line no-console
  console.log('[INFO]', msg, meta ? safe(meta) : '')
}
export function logWarn(msg: string, meta?: any) {
  // eslint-disable-next-line no-console
  console.warn('[WARN]', msg, meta ? safe(meta) : '')
}
export function logError(msg: string, meta?: any) {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', msg, meta ? safe(meta) : '')
}

function safe(v: any) {
  try {
    return JSON.stringify(v, (_k, val) =>
      typeof val === 'bigint' ? val.toString() : val
    )
  } catch {
    return '[unserializable]'
  }
}
