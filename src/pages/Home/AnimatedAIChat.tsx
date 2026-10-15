import { useEffect, useRef, useState, useTransition } from 'react'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { LoaderCircle, Paperclip, SendIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAutoResizeTextarea } from './useAutoResizeTextarea'
import {
  getStoredApiKey,
  resolveApiKey,
  sendChatMessage,
  type ChatMessage,
} from './gemini-client'
import {
  ApiKeyNotice,
  AttachmentList,
  ChatBackdrop,
  ChatError,
  MessageList,
  ThinkingBadge,
} from './ChatChrome'
import { parseToolCalls, executeTool } from './ai-tools'

/** AI chat landing content for Home — header itself stays in AppShell. */
export function AnimatedAIChat() {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [storedKey, setStoredKey] = useState<string>(() => getStoredApiKey())
  const [isTyping, setIsTyping] = useState(false)
  const [isPending, startTransition] = useTransition()
  const pendingRef = useRef<AbortController | null>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [focused, setFocused] = useState(false)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 })
  const apiKey = resolveApiKey(storedKey)

  // Re-read the Settings-saved key when the user returns from Settings.
  useEffect(() => {
    const refresh = () => setStoredKey(getStoredApiKey())
    window.addEventListener('hashchange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('hashchange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  // Abort any in-flight request when leaving Home.
  useEffect(() => () => pendingRef.current?.abort(), [])

  useEffect(() => {
    const move = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  const busy = isTyping || isPending

  const send = () => {
    const text = value.trim()
    if (!text || busy) return
    if (!apiKey) {
      setError('Missing Gemini API key. Add one in Settings → Integrations.')
      return
    }
    const next: ChatMessage[] = [...messages, { role: 'user', text }]
    setMessages(next)
    setValue('')
    adjustHeight(true)
    setError(null)
    pendingRef.current?.abort()
    const controller = new AbortController()
    pendingRef.current = controller
    startTransition(() => {
      setIsTyping(true)
      void (async () => {
        try {
          const reply = await sendChatMessage(next, apiKey, controller.signal)
          if (controller.signal.aborted) return
          
          // Parse and execute any tool calls
          const { cleanText, calls } = parseToolCalls(reply)
          
          // Execute tools
          const toolResults: string[] = []
          for (const call of calls) {
            const result = await executeTool(call)
            if (result.success) {
              toolResults.push(`✓ ${result.message}`)
            } else {
              toolResults.push(`✗ ${result.message}`)
            }
          }
          
          // Combine clean text with tool results
          let finalReply = cleanText
          if (toolResults.length > 0) {
            finalReply += (cleanText ? '\n\n' : '') + toolResults.join('\n')
          }
          
          setMessages((current) => [...current, { role: 'assistant', text: finalReply }])
        } catch (err) {
          if (controller.signal.aborted) return
          setError(err instanceof Error ? err.message : 'Could not reach Gemini.')
        } finally {
          if (pendingRef.current === controller) pendingRef.current = null
          setIsTyping(false)
        }
      })()
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) send()
    }
  }

  const attach = () => setAttachments((p) => [...p, `file-${Math.floor(Math.random() * 1000)}.pdf`])
  const removeAt = (i: number) => setAttachments((p) => p.filter((_, x) => x !== i))

  const hasConversation = messages.length > 0

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 py-10 text-text">
      <ChatBackdrop />
      <MessageList messages={messages} />
      <ChatError message={error} onDismiss={() => setError(null)} />
      <ApiKeyNotice hasKey={apiKey.length > 0} />
      <div className="relative mx-auto w-full max-w-2xl">
        <motion.div className="relative z-10 space-y-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
          {!hasConversation && (
          <div className="space-y-3 text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="inline-block">
              <h2 className="bg-gradient-to-r from-text to-text-muted bg-clip-text pb-1 text-3xl font-medium tracking-tight text-transparent">
                How can I help today?
              </h2>
              <motion.div className="h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" initial={{ width: 0, opacity: 0 }} animate={{ width: '100%', opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />
            </motion.div>
            <motion.p className="text-sm text-text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              Type a command or ask a question
            </motion.p>
          </div>
          )}
          <motion.div className="relative rounded-2xl border border-border bg-surface shadow-md backdrop-blur-2xl" initial={{ scale: 0.98 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="p-4">
              <label className="sr-only" htmlFor="home-ai-input">Ask LifeOS a question</label>
              <textarea id="home-ai-input" ref={textareaRef} value={value} rows={2} placeholder="Ask LifeOS a question..." style={{ overflow: 'hidden' }}
                className={cn('min-h-[60px] w-full resize-none border-none bg-transparent px-4 py-3', 'text-sm text-text', 'focus:outline-none', 'placeholder:text-text-faint')}
                onChange={(e) => { setValue(e.target.value); adjustHeight() }}
                onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            </div>
            <AttachmentList files={attachments} onRemove={removeAt} />
            <div className="flex items-center justify-between gap-4 border-t border-border p-4">
              <div className="flex items-center gap-2">
                <motion.button type="button" onClick={attach} whileTap={{ scale: 0.94 }} className="relative rounded-lg p-2 text-text-muted transition-colors hover:text-text" aria-label="Attach a file">
                  <Paperclip className="h-4 w-4" />
                </motion.button>
              </div>
              <motion.button type="button" onClick={send} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} disabled={isTyping || isPending || !value.trim()}
                className={cn('flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all', value.trim() ? 'bg-brand text-brand-contrast shadow-xs hover:bg-brand-hover' : 'bg-surface-sunken text-text-faint')}>
                {isTyping ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <ThinkingBadge visible={isTyping} />
      {focused && (
        <motion.div className="pointer-events-none fixed z-0 h-[50rem] w-[50rem] rounded-full bg-brand/10 opacity-60 blur-[96px]" aria-hidden="true"
          animate={{ x: mouse.x - 400, y: mouse.y - 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 150, mass: 0.5 }} />
      )}
    </div>
  )
}
