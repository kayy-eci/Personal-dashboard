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
      className={`github-activity-grid${className ? ` ${className}` : ''}`}
      ref={containerRef}
      onPointerLeave={() => setHoveredDay(null)}
    >
      <div className="github-activity-grid__header">
        <p>
          <strong>{totalActivities.toLocaleString()}</strong>
          <span>{` ${pluralize(activityType, totalActivities)} ${periodLabel}`}</span>
        </p>
        <Legend />
      </div>
      <p className="github-activity-grid__description">{description}</p>

      <div className="github-activity-grid__viewport" ref={gridViewportRef}>
        <div
          className="github-activity-grid__months"
          style={{ width: fittedGridWidth, marginLeft: WEEKDAY_LABEL_WIDTH + WEEKDAY_LABEL_GAP }}
        >
          {grid.monthLabels.map((month) => (
            <span
              key={`${month.col}-${month.label}`}
              style={{ left: month.col * (fittedCellSize + fittedCellGap) }}
            >
              {month.label}
            </span>
          ))}
        </div>

        <div className="github-activity-grid__body">
          <div className="github-activity-grid__weekdays" style={{ gap: fittedCellGap }}>
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={index}
                style={{ height: fittedCellSize, width: WEEKDAY_LABEL_WIDTH }}
              >
                {weekday}
              </span>
            ))}
          </div>
          <div className="github-activity-grid__weeks" style={{ gap: fittedCellGap }}>
            {grid.weeks.map((week, weekIndex) => (
              <div
                className="github-activity-grid__week"
                key={weekIndex}
                style={{ gap: fittedCellGap }}
              >
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <span
                        className="github-activity-grid__empty-cell"
                        key={`empty-${weekIndex}-${dayIndex}`}
                        style={{ width: fittedCellSize, height: fittedCellSize }}
                      />
                    )
                  }

                  const ratio = day.count / max
                  const level = day.count <= 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4
                  const fromEnd = days.length - 1 - (weekIndex * 7 + dayIndex)
                  return (
                    <motion.button
                      className={`github-activity-grid__cell github-activity-grid__cell--level-${level}`}
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
                      aria-label={`${day.count} ${pluralize(activityType, day.count)} on ${formatDate(day.date)}`}
                      style={{ width: fittedCellSize, height: fittedCellSize }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        className="github-activity-grid__tooltip"
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
            <span> · {formatDate(hoveredDay.date)}</span>
          </>
        )}
      </motion.div>
    </div>
  )
}

function Legend() {
  return (
    <div className="github-activity-grid__legend" aria-label="Activity level: less to more">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          className={`github-activity-grid__cell github-activity-grid__cell--level-${level}`}
          key={level}
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
