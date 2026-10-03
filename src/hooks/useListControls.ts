import { useState } from 'react'

export interface SortOption<T> {
  id: string
  label: string
  compare: (a: T, b: T) => number
}

/** Generic search predicate builder — case-insensitive substring over fields. */
export function matchesQuery<T>(item: T, query: string, fields: (item: T) => Array<string | undefined | null>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return fields(item).some((field) => field?.toLowerCase().includes(q))
}

export function applySort<T>(items: T[], sortId: string, options: SortOption<T>[]): T[] {
  const option = options.find((o) => o.id === sortId)
  if (!option) return items
  return [...items].sort(option.compare)
}

export const byString = (field: <T>(t: T) => string) => (a: unknown, b: unknown) =>
  field(a as never).localeCompare(field(b as never))

/** Combines search + predicate filters + sort. Cheap enough to call directly. */
export function filterAndSort<T>(
  items: T[],
  query: string,
  queryFields: (item: T) => Array<string | undefined | null>,
  predicates: Array<(item: T) => boolean>,
  sortId: string,
  sortOptions: SortOption<T>[],
): T[] {
  const filtered = items.filter(
    (item) => matchesQuery(item, query, queryFields) && predicates.every((p) => p(item)),
  )
  return applySort(filtered, sortId, sortOptions)
}

/** Small hook wrapper for keeping a search string with a stable setter. */
export function useSearch(initial = '') {
  const [query, setQuery] = useState(initial)
  return { query, setQuery, clear: () => setQuery(''), hasQuery: query.trim().length > 0 }
}
