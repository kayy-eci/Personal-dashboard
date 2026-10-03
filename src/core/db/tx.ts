import type { Table } from 'dexie'
import { getDb } from './db'

/** Run fn in a single read-write transaction over the given tables. */
export async function inTx<T>(tables: Table | Table[], fn: () => Promise<T>): Promise<T> {
  const db = getDb()
  return (await db.transaction('rw', tables as never, fn as never)) as T
}
