import * as React from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

export interface ActivityDay {
  date: string
  count: number
}

export interface GitHubActivityGridProps {
  days: ActivityDay[]
  maxCount?: number
  cellSize?: number
  cellGap?: number
  className?: string
  activityType?: string
  periodLabel?: string
  description?: string
  /** Render the trailing (today) cell in the accent color. Defaults on. */
  highlightToday?: boolean
  /** Extra class applied to the today cell alongside the accent style. */
  todayClassName?: string
}

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_LABEL_WIDTH = 22
const WEEKDAY_LABEL_GAP = 4

export function GitHubActivityGrid({
  days,
  maxCount,
  cellSize = 11,
  cellGap = 3,
  className,
  activityType = 'contribution',
  periodLabel = 'in the last year',
  description = 'Illustrative sample activity; not connected to GitHub.',
  highlightToday = true,
  todayClassName,
}: GitHubActivityGridProps) {
  const reduceMotion = useReducedMotion()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const gridViewportRef = React.useRef<HTMLDivElement>(null)
  const tooltipX = useMotionValue(0)
  const tooltipY = useMotionValue(0)
  const springX = useSpring(tooltipX, { stiffness: 480, damping: 40, mass: 0.5 })
  const springY = useSpring(tooltipY, { stiffness: 480, damping: 40, mass: 0.5 })
  const [hoveredDay, setHoveredDay] = React.useState<ActivityDay | null>(null)
  const [gridViewportWidth, setGridViewportWidth] = React.useState(0)

  const max = React.useMemo(() => {
    if (typeof maxCount === 'number' && maxCount > 0) return maxCount
    return Math.max(1, ...days.map((day) => day.count))
  }, [days, maxCount])

  const grid = React.useMemo(() => {
    if (days.length === 0) {
      return {
        weeks: [] as (ActivityDay | null)[][],
        monthLabels: [] as { col: number; label: string }[],
      }
    }

    const first = new Date(`${days[0].date}T00:00:00`)
    const flat: (ActivityDay | null)[] = [
      ...Array.from({ length: first.getDay() }, () => null),
      ...days,
    ]
    while (flat.length % 7 !== 0) flat.push(null)

    const weeks: (ActivityDay | null)[][] = []
    for (let index = 0; index < flat.length; index += 7) {
      weeks.push(flat.slice(index, index + 7))
    }

    const monthLabels: { col: number; label: string }[] = []
    let previousMonth = -1
    weeks.forEach((week, col) => {
      const firstDay = week.find((day): day is ActivityDay => day !== null)
      if (!firstDay) return
      const month = new Date(`${firstDay.date}T00:00:00`).getMonth()
      if (month !== previousMonth) {
        monthLabels.push({ col, label: MONTHS[month] })
        previousMonth = month
      }
    })
    return { weeks, monthLabels }
  }, [days])

  React.useEffect(() => {
    const viewport = gridViewportRef.current
    if (!viewport) return

    const measure = () => setGridViewportWidth(viewport.clientWidth)
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const showTooltip = (
    target: HTMLButtonElement,
    day: ActivityDay,
  ) => {
    const container = containerRef.current
    if (!container) return
    const cellRect = target.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    tooltipX.set(cellRect.left - containerRect.left + cellRect.width / 2)
    tooltipY.set(cellRect.top - containerRect.top - 6)
    setHoveredDay(day)
  }

  const totalActivities = React.useMemo(
    () => days.reduce((sum, day) => sum + day.count, 0),
    [days],
  )
  /** Local YYYY-MM-DD for the trailing cell — the "today" highlight target. */
  const todayKey = React.useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])
  const weekCount = grid.weeks.length
  const baseGridWidth = weekCount * cellSize + Math.max(0, weekCount - 1) * cellGap
  const availableGridWidth = Math.max(
    0,
    gridViewportWidth - WEEKDAY_LABEL_WIDTH - WEEKDAY_LABEL_GAP,
  )
  const fitScale =
    gridViewportWidth > 0 && baseGridWidth > availableGridWidth
      ? availableGridWidth / baseGridWidth
      : 1
  const fittedCellSize = cellSize * fitScale
  const fittedCellGap = cellGap * fitScale
  const fittedGridWidth =
    weekCount * fittedCellSize + Math.max(0, weekCount - 1) * fittedCellGap

  return (
    <div
      className={`relative isolate w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/90 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)] ${className ?? ''}`}
      ref={containerRef}
      onPointerLeave={() => setHoveredDay(null)}
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="m-0 flex flex-wrap items-baseline gap-[0.35rem] text-[0.88rem] leading-[1.35] text-text-muted">
          <strong className="text-[clamp(1.4rem,1.9vw,2.1rem)] font-bold tracking-[-0.04em] text-text tabular-nums">{totalActivities.toLocaleString()}</strong>
          <span>{` ${pluralize(activityType, totalActivities)} ${periodLabel}`}</span>
        </p>
        <Legend />
      </div>
      <p className="m-0 mb-3 text-[0.72rem] leading-[1.5] text-text-muted">{description}</p>

      <div className="w-full min-w-0 overflow-hidden py-[0.1rem] pb-[0.2rem]" ref={gridViewportRef}>
        <div
          className="relative h-4 text-[0.64rem] leading-none text-text-muted"
          style={{ width: fittedGridWidth, marginLeft: WEEKDAY_LABEL_WIDTH + WEEKDAY_LABEL_GAP }}
        >
          {grid.monthLabels.map((month) => (
            <span
              key={`${month.col}-${month.label}`}
              className="absolute top-0"
              style={{ left: month.col * (fittedCellSize + fittedCellGap) }}
            >
              {month.label}
            </span>
          ))}
        </div>

        <div className="flex">
          <div className="flex shrink-0 flex-col justify-between text-[0.57rem] leading-none text-text-muted" style={{ gap: fittedCellGap }}>
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={index}
                className="flex items-center"
                style={{ height: fittedCellSize, width: WEEKDAY_LABEL_WIDTH }}
              >
                {weekday}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: fittedCellGap }}>
            {grid.weeks.map((week, weekIndex) => (
              <div
                className="flex shrink-0 flex-col"
                key={weekIndex}
                style={{ gap: fittedCellGap }}
              >
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <span
                        key={`empty-${weekIndex}-${dayIndex}`}
                        className="block shrink-0 rounded border-0 p-0"
                        style={{ width: fittedCellSize, height: fittedCellSize }}
                      />
                    )
                  }

                  const ratio = day.count / max
                  const level = day.count <= 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4
                  const isToday = highlightToday && day.date === todayKey
                  const todaySuffix = isToday ? ' (today)' : ''
                  const fromEnd = days.length - 1 - (weekIndex * 7 + dayIndex)
                  return (
                    <motion.button
                      className={`block shrink-0 rounded border-0 p-0 cursor-pointer ${isToday ? todayClassName ?? '' : ''}`}
                      key={day.date}
                      type="button"
                      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { delay: fromEnd * 0.002, type: 'spring', stiffness: 420, damping: 28, mass: 0.6 }
                      }
                      onPointerEnter={(event) => showTooltip(event.currentTarget, day)}
                      onFocus={(event) => showTooltip(event.currentTarget, day)}
                      onBlur={() => setHoveredDay(null)}
                      aria-label={`${day.count} ${pluralize(activityType, day.count)} on ${formatDate(day.date)}${todaySuffix}`}
                      aria-current={isToday ? 'date' : undefined}
                      style={{ width: fittedCellSize, height: fittedCellSize, backgroundColor: levelColor(level) }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-md border border-border bg-surface-overlay px-2 py-1 text-[0.6875rem] text-text shadow-sm [&_span]:text-text-muted"
        aria-hidden={!hoveredDay}
        style={{
          x: springX,
          y: springY,
          opacity: hoveredDay ? 1 : 0,
          translateX: '-50%',
          translateY: '-100%',
        }}
      >
        {hoveredDay && (
          <>
            <strong>{hoveredDay.count}</strong>{' '}
            {pluralize(activityType, hoveredDay.count)}
            <span>
              {' '}
              · {formatDate(hoveredDay.date)}
              {highlightToday && hoveredDay.date === todayKey ? ' · today' : ''}
            </span>
          </>
        )}
      </motion.div>
    </div>
  )
}

function levelColor(level: number) {
  switch (level) {
    case 1: return 'var(--gh-1)'
    case 2: return 'var(--gh-2)'
    case 3: return 'var(--gh-3)'
    case 4: return 'var(--gh-4)'
    default: return 'var(--gh-0)'
  }
}

function Legend() {
  return (
    <div className="flex shrink-0 items-center gap-[0.35rem] text-[0.69rem] leading-none text-text-muted" aria-label="Activity level: less to more">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          className="block h-[0.7rem] w-[0.7rem] rounded-[0.2rem]"
          key={level}
          style={{ backgroundColor: levelColor(level) }}
          aria-hidden="true"
        />
      ))}
      <span>More</span>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function pluralize(noun: string, count: number) {
  if (count === 1) return noun
  return noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`
}
