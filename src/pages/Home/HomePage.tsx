import { AnimatedAIChat } from './AnimatedAIChat'

/**
 * Home landing page. The shared AppShell owns the cover/title header above
 * this — this file only owns the page body (the AI chat canvas).
 */
export function HomePage({ currentChatId, onChatChange }: { currentChatId?: number | null; onChatChange?: (id: number | null) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col p-3 pb-5 min-[769px]:p-4 min-[769px]:pb-6">
      <AnimatedAIChat currentChatId={currentChatId} onChatChange={onChatChange} />
    </div>
  )
}
