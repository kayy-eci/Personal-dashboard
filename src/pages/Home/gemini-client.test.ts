import { describe, expect, it } from 'vitest'
import {
  describeHttpError,
  extractReplyText,
  resolveApiKey,
  toGeminiContents,
} from '@/pages/Home/gemini-client'

describe('gemini-client', () => {
  it('maps chat roles to Gemini user/model roles and drops blanks', () => {
    const contents = toGeminiContents([
      { role: 'user', text: '  hello  ' },
      { role: 'assistant', text: 'hi there' },
      { role: 'user', text: '   ' },
    ])
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: '  hello  ' }] },
      { role: 'model', parts: [{ text: 'hi there' }] },
    ])
  })

  it('joins candidate parts and rejects empty responses', () => {
    expect(
      extractReplyText({ candidates: [{ content: { parts: [{ text: 'Hello' }, { text: ' world' }] } }] }),
    ).toBe('Hello world')
    expect(() => extractReplyText({ candidates: [] })).toThrow('empty response')
    expect(() => extractReplyText({ error: { message: 'bad key' } })).toThrow('bad key')
  })

  it('describes HTTP failures with actionable text', () => {
    expect(describeHttpError(400)).toContain('400')
    expect(describeHttpError(403)).toContain('403')
    expect(describeHttpError(429)).toContain('rate limit')
    expect(describeHttpError(500)).toContain('unavailable')
  })

  it('prefers the stored key over the build-time default', () => {
    expect(resolveApiKey('  stored-key  ')).toBe('stored-key')
    // With no stored key the build-time default applies ('' in test env).
    expect(resolveApiKey('')).toBe('')
  })
})
