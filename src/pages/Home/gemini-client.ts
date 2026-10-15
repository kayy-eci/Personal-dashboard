/**
 * Minimal Gemini chat client (REST, no SDK — matches the codebase's
 * dependency-free approach to remote calls).
 *
 * Key resolution: Settings override (localStorage) wins over build-time
 * `VITE_GEMINI_API_KEY`. The same localStorage tradeoff as the GitHub token
 * applies — convenient, but any page script can read it, so use a key with
 * tight API restrictions in Google AI Studio.
 */

export const GEMINI_API_KEY_STORAGE_KEY = 'lifeos-gemini-api-key'

export const GEMINI_MODEL = 'gemini-3.8-flash'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const SYSTEM_PROMPT =
  'You are LifeOS, a friendly personal productivity assistant. ' +
  'Help the user plan their day, build habits, and stay consistent. ' +
  'Keep replies concise and actionable. ' +
  'Do NOT use markdown formatting, asterisks, or special characters. Write plain text only.\n\n' +
  'When the user asks you to create a habit or task, use these tools:\n' +
  '- [TOOL:create_habit|name=Habit name|frequency=daily] for habits\n' +
  '- [TOOL:create_task|title=Task title|description=Details|deadline=YYYY-MM-DD] for tasks\n\n' +
  'Example: "Ill create that for you. [TOOL:create_habit|name=Morning meditation|frequency=daily]"'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface GeminiPart {
  text?: string
}

interface GeminiContent {
  role?: string
  parts?: GeminiPart[]
}

interface GeminiResponse {
  candidates?: Array<{ content?: GeminiContent }>
  error?: { message?: string; status?: string; code?: number }
}

export function getBuildTimeApiKey(): string {
  try {
    const key = import.meta.env.VITE_GEMINI_API_KEY
    return typeof key === 'string' ? key.trim() : ''
  } catch {
    return ''
  }
}

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    return (window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) ?? '').trim()
  } catch {
    return ''
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key.trim()) window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim())
    else window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
  } catch {
    // non-fatal — key still applies for the session via state
  }
}

/** Settings override wins; falls back to the build-time env default. */
export function resolveApiKey(storedKey: string): string {
  const trimmed = storedKey.trim()
  if (trimmed) return trimmed
  return getBuildTimeApiKey()
}

export function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  return messages
    .filter((message) => message.text.trim().length > 0)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.text }],
    }))
}

export function extractReplyText(response: GeminiResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()
  if (text) return text
  if (response.error?.message) throw new Error(response.error.message)
  throw new Error('Gemini returned an empty response.')
}

export function describeHttpError(status: number): string {
  if (status === 400) return 'Gemini rejected the request (400). Check that the API key is valid.'
  if (status === 403) return 'Gemini denied the request (403). The key may be restricted.'
  if (status === 404) return `Model ${GEMINI_MODEL} was not found (404).`
  if (status === 429) return 'Gemini rate limit reached (429). Wait a moment and retry.'
  if (status >= 500) return `Gemini is unavailable (${status}). Try again shortly.`
  return `Gemini request failed (${status}).`
}

/**
 * Sends the full conversation and resolves with the assistant reply text.
 * History (including the new user message) must already be in `messages`.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  apiKey: string,
  signal: AbortSignal,
): Promise<string> {
  const key = apiKey.trim()
  if (!key) throw new Error('Missing Gemini API key. Add one in Settings → Integrations.')
  const contents = toGeminiContents(messages)
  if (contents.length === 0) throw new Error('Nothing to send yet.')

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    },
  )

  if (!response.ok) throw new Error(describeHttpError(response.status))
  const payload = (await response.json()) as GeminiResponse
  return extractReplyText(payload)
}
