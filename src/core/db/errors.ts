export type DataErrorCode = 'STORAGE_FULL' | 'STORAGE_UNAVAILABLE' | 'DATABASE_CLOSED' | 'VALIDATION' | 'ALREADY_COMPLETED' | 'ALREADY_CHECKED_IN' | 'RECOVERY_LIMIT_REACHED' | 'NOT_FOUND' | 'VERSION_REJECTED' | 'CHECKSUM_MISMATCH' | 'BAD_BACKUP'

export class DataError extends Error {
  code: DataErrorCode
  constructor(code: DataErrorCode, message: string) {
    super(`${code}: ${message}`)
    this.name = 'DataError'
    this.code = code
  }
}

export function toDataError(err: unknown): DataError {
  if (err instanceof DataError) return err
  const name = (err as { name?: string })?.name ?? ''
  if (name === 'QuotaExceededError') return new DataError('STORAGE_FULL', 'Browser storage is full. Export your data, then free space.')
  if (name === 'DatabaseClosedError') return new DataError('DATABASE_CLOSED', 'LifeOS was updated in another tab. Reload to continue.')
  if (name === 'InvalidStateError' || name === 'UnknownError') return new DataError('STORAGE_UNAVAILABLE', 'Browser storage is unavailable (private mode?). Use export/import with a regular window.')
  return new DataError('STORAGE_UNAVAILABLE', err instanceof Error ? err.message : 'Storage error')
}
