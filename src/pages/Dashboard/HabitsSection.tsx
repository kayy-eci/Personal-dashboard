import { useId } from 'react'
import { HabitsIcon } from '../../components/icons/Icons'
import type { HabitItem } from './dashboard-data'

interface HabitsSectionProps {
  habits: Array<HabitItem & { done: boolean }>
  onToggle: (habit: HabitItem & { done: boolean }) => void
}

const week = [
  { day: 'Mon', level: 'full' },
  { day: 'Tue', level: 'full' },
  { day: 'Wed', level: 'full' },
  { day: 'Thu', level: 'full' },
  { day: 'Fri', level: 'partial' },
  { day: 'Sat', level: 'full' },
  { day: 'Sun', level: 'today' },
]

function tagTone(attribute: string) {
  switch (attribute.toLowerCase()) {
    case 'str': return 'text-[#be123c] bg-[#fff1f2] border-[#fecdd3]'
    case 'int': return 'text-[#1d4ed8] bg-[#eff6ff] border-[#bfdbfe]'
    case 'disc': return 'text-[#b45309] bg-[#fffbeb] border-[#fde68a]'
    case 'focus': return 'text-[#0f766e] bg-[#f0fdfa] border-[#99f6e4]'
    default: return 'text-[#475569] bg-[#f8fafc] border-[#e2e8f0]'
  }
}

export function HabitsSection({ habits, onToggle }: HabitsSectionProps) {
  const headingId = useId()

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs scroll-mt-4 max-[600px]:p-3" id="habits" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3 max-[600px]:items-start">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#efdcb0] bg-[#fdf6e8] text-brand">
            <HabitsIcon className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-[1.3] text-text" id={headingId}>
              Today&apos;s Habits &amp; Execution
            </h2>
            <p className="mt-0.5 text-xs leading-[1.45] text-text-muted">
              Build consistency one check-in at a time.
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-[0.3rem] rounded-md border border-border bg-surface-sunken px-2 py-1.5 [max-[600px]:ml-auto]"
          role="img"
          aria-label={`Weekly consistency: ${week
            .map(({ day, level }) => `${day} ${level === 'today' ? 'in progress' : level === 'partial' ? '75 percent' : '100 percent'}`)
            .join(', ')}`}
        >
          <span className="mr-[0.15rem] font-mono text-[0.65rem] font-bold text-text-muted">7D</span>
          {week.map(({ day, level }) => (
            <span
              key={day}
              className={`h-3 w-3 rounded-[3px] ${level === 'full' ? 'bg-[#10b981]' : level === 'partial' ? 'bg-[#6ee7b7]' : 'bg-[#0ea5e9] outline outline-2 outline-[#bae6fd] outline-offset-1'}`}
              title={`${day}: ${level === 'today' ? 'In progress' : level === 'partial' ? '75%' : '100%'}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-2" role="list">
        {habits.map((habit) => (
          <li
            className={`grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-border p-3 transition-colors max-[600px]:grid-cols-[1.25rem_minmax(0,1fr)] max-[600px]:gap-2 ${habit.done ? 'bg-surface-sunken' : 'bg-surface hover:bg-[#fafbfc] hover:border-border-strong'}`}
            key={habit.id}
          >
            <button
              type="button"
              className={`inline-flex h-5 w-5 items-center justify-center rounded-[5px] border text-[0.8rem] font-bold leading-none transition-colors max-[600px]:row-span-2 ${habit.done ? 'border-[#059669] bg-[#059669] text-white' : 'border-[#cbd5e1] bg-surface text-transparent hover:border-[#dc2626] hover:text-[#dc2626]'}`}
              aria-pressed={habit.done}
              aria-label={`${habit.done ? 'Undo completion of' : 'Mark complete'} ${habit.name}`}
              onClick={() => onToggle(habit)}
            >
              {habit.done ? '✓' : ''}
            </button>

            <div className="min-w-0 max-[600px]:col-start-2">
              <div className="flex flex-wrap items-center gap-[0.35rem]">
                <span className={`mr-[0.15rem] text-sm font-semibold ${habit.done ? 'text-text-muted line-through' : 'text-text'}`}>{habit.name}</span>
                {habit.attributes.map((attribute) => (
                  <span
                    key={attribute}
                    className={`inline-flex max-w-full items-center rounded border border-transparent px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold leading-[1.3] ${tagTone(attribute)}`}
                  >
                    {attribute}
                  </span>
                ))}
                <span className="inline-flex max-w-full items-center rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold leading-[1.3] text-[#475569]">{habit.difficulty}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-[0.65rem] text-text-faint [&>span+span::before]:mr-1.5 [&>span+span::before]:text-[#cbd5e1] [&>span+span::before]:content-['·']">
                <span>{habit.streak}d streak</span>
                {habit.consistency !== null && (
                  <span>{habit.consistency}% consistency</span>
                )}
                {habit.recovery && <span className="text-[#047857]">Restores vitality</span>}
              </div>
            </div>

            <span className={`whitespace-nowrap rounded-[5px] border px-[0.45rem] py-[0.3rem] font-mono text-[0.65rem] font-bold max-[600px]:col-start-2 max-[600px]:justify-self-start ${habit.done ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]' : 'border-[#efdcb0] bg-[#fdf6e8] text-brand'}`}>
              {habit.done ? 'Earned ' : '+'}
              {habit.reward} {habit.rewardType}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.6875rem] leading-[1.5] text-text-faint">
        Demo check-ins are temporary and do not update your saved player stats.
      </p>
    </section>
  )
}
