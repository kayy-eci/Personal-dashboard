import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { CommandSuggestion } from './commandSuggestions'
import type { ChatMessage } from './gemini-client'

export function ChatBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-brand/10 blur-[128px] filter" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-brand/10 blur-[128px] delay-700 filter" />
      <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-brand/10 blur-[96px] delay-1000 filter" />
    </div>
  )
}

interface PaletteProps {
  open: boolean
  boxRef: React.RefObject<HTMLDivElement | null>
  items: CommandSuggestion[]
  active: number
  onPick: (index: number) => void
}

export function CommandPalette({ open, boxRef, items, active, onPick }: PaletteProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={boxRef} className="absolute inset-x-4 bottom-full z-50 mb-2 overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-md" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
          <div className="py-1">
            {items.map((suggestion, index) => (
              <motion.div key={suggestion.prefix} onClick={() => onPick(index)}
                className={cn('flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors', active === index ? 'bg-surface-sunken text-text' : 'text-text-muted hover:bg-surface-sunken/60')}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}>
                <div className="flex h-5 w-5 items-center justify-center text-text-muted">{suggestion.icon}</div>
                <div className="font-medium">{suggestion.label}</div>
                <div className="ml-1 text-xs text-text-faint">{suggestion.prefix}</div>
                <div className="ml-auto hidden text-[0.6875rem] text-text-faint sm:block">{suggestion.description}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface FilesProps {
  files: string[]
  onRemove: (index: number) => void
}

export function AttachmentList({ files, onRemove }: FilesProps) {
  return (
    <AnimatePresence>
      {files.length > 0 && (
        <motion.div className="flex flex-wrap gap-2 px-4 pb-3" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          {files.map((file, index) => (
            <motion.div key={`${file}-${index}`} className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-1.5 text-xs text-text-muted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <span>{file}</span>
              <button type="button" onClick={() => onRemove(index)} className="text-text-faint transition-colors hover:text-text" aria-label={`Remove ${file}`}>
                <span aria-hidden="true">x</span>
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PicksProps {
  items: CommandSuggestion[]
  onPick: (index: number) => void
}

export function SuggestionButtons({ items, onPick }: PicksProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((suggestion, index) => (
        <motion.button key={suggestion.prefix} type="button" onClick={() => onPick(index)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted transition-all hover:bg-surface-sunken hover:text-text"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
          {suggestion.icon}
          <span>{suggestion.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

export function ThinkingBadge({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-surface-overlay px-4 py-2 shadow-md backdrop-blur-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-8 items-center justify-center rounded-full bg-surface-sunken text-center">
              <span className="mb-0.5 text-xs font-medium text-text">ai</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>Thinking</span>
              <span className="ml-1 flex items-center">
                {[1, 2, 3].map((dot) => (
                  <motion.span key={dot} className="mx-0.5 h-1.5 w-1.5 rounded-full bg-brand" initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }} />
                ))}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  if (messages.length === 0) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-4" role="log" aria-label="Conversation">
      {messages.map((message, index) => {
        const isUser = message.role === 'user'
        return (
          <div key={`${index}-${message.role}`} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed',
                isUser
                  ? 'border-brand bg-brand text-brand-contrast'
                  : 'border-border bg-surface text-text shadow-xs',
              )}
            >
              {message.text}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export function ChatError({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null
  const needsKey = message.toLowerCase().includes('api key')
  return (
    <div
      className="mx-auto flex w-full max-w-2xl items-start gap-2.5 rounded-lg border border-danger/40 bg-surface px-3.5 py-2.5 text-sm text-text"
      role="alert"
    >
      <span className="min-w-0 flex-1">
        {message}{' '}
        {needsKey && (
          <a href="#/settings" className="font-semibold underline underline-offset-2">
            Open Settings
          </a>
        )}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
      >
        Dismiss
      </button>
    </div>
  )
}

export function ApiKeyNotice({ hasKey }: { hasKey: boolean }) {
  if (hasKey) return null
  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <p className="rounded-lg border border-dashed border-border-strong bg-surface px-3.5 py-2.5 text-center text-xs leading-relaxed text-text-muted">
        Add your Gemini API key in{' '}
        <a href="#/settings" className="font-semibold text-text underline underline-offset-2">
          Settings → Integrations
        </a>{' '}
        (or set <code>VITE_GEMINI_API_KEY</code>) to get live answers.
      </p>
    </div>
  )
}
