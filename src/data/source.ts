export type DataSource = 'mock' | 'local'

export const DATA_SOURCE: DataSource =
  import.meta.env.VITE_DATA_SOURCE === 'local' ? 'local' : 'mock'
