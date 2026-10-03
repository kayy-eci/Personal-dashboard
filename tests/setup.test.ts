import { describe, expect, it } from 'vitest'

describe('setup', () => {
  it('runs under vitest with fake-indexeddb', () => {
    expect(typeof indexedDB).toBe('object')
  })
})
