import { useEffect, useState } from 'react'
import { usePersistentState } from '../../lib/storage'
import './DashboardWidgets.css'

const FOCUS_MODES = [
  { id: 'work', label: 'Work', duration: 25 * 60 },
  { id: 'short-break', label: 'Short break', duration: 5 * 60 },
  { id: 'long-break', label: 'Long break', duration: 15 * 60 },
] as const

type FocusModeId = (typeof FOCUS_MODES)[number]['id']

interface WeatherConditions {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  code: number
  isDay: boolean
}

export function DashboardWidgets() {
  return (
    <section className="dashboard-widgets" aria-label="Local time, weather, and focus">
      <LocalTimeCard />
      <LocalWeatherCard />
      <FocusSessionCard />
    </section>
  )
}

function MapPinGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8.3c0 4.3-6 9-6 9s-6-4.7-6-9a6 6 0 1 1 12 0Z" />
      <circle cx="10" cy="8" r="2" />
    </svg>
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function LocalTimeCard() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const hourAngle = ((hours % 12) + minutes / 60) * 30
  const minuteAngle = (minutes + seconds / 60) * 6
  const secondAngle = seconds * 6
  const clockLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now)
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(now)
  const hour = (timeParts.find((part) => part.type === 'hour')?.value ?? '').padStart(2, '0')
  const minute = timeParts.find((part) => part.type === 'minute')?.value ?? ''
  const period = timeParts.find((part) => part.type === 'dayPeriod')?.value ?? ''

  return (
    <article className="dashboard-widget dashboard-widget--time" aria-labelledby="local-time-heading">
      <h2 className="dashboard-widget__eyebrow" id="local-time-heading">Current time</h2>
      <time className="dashboard-clock__time" dateTime={now.toISOString()} aria-label={clockLabel}>
        <span>{hour}:{minute}</span>
        <span className="dashboard-clock__period">{period}</span>
      </time>
      <p className="dashboard-clock__message">
        <SunGlyph />
        <span>The day is yours.<br />Make it productive.</span>
      </p>
      <svg className="dashboard-clock__dial" viewBox="0 0 100 100" role="img" aria-label={`Analog clock showing ${clockLabel}`}>
        <circle className="dashboard-clock__face" cx="50" cy="50" r="46" />
        {Array.from({ length: 12 }, (_, index) => (
          <line
            className="dashboard-clock__tick"
            key={index}
            x1="50"
            y1="7"
            x2="50"
            y2={index % 3 === 0 ? '12' : '10'}
            transform={`rotate(${index * 30} 50 50)`}
          />
        ))}
        <line className="dashboard-clock__hand dashboard-clock__hand--hour" x1="50" y1="51" x2="50" y2="25" transform={`rotate(${hourAngle} 50 50)`} />
        <line className="dashboard-clock__hand dashboard-clock__hand--minute" x1="50" y1="52" x2="50" y2="15" transform={`rotate(${minuteAngle} 50 50)`} />
        <line className="dashboard-clock__hand dashboard-clock__hand--second" x1="50" y1="55" x2="50" y2="12" transform={`rotate(${secondAngle} 50 50)`} />
        <circle className="dashboard-clock__hub" cx="50" cy="50" r="2.5" />
      </svg>
    </article>
  )
}

function LocalWeatherCard() {
  const [conditions, setConditions] = useState<WeatherConditions | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unit, setUnit] = usePersistentState<'C' | 'F'>('weather-unit', 'C')

  const displayTemp = (celsius: number) =>
    unit === 'C' ? Math.round(celsius) : Math.round((celsius * 9) / 5 + 32)

  const loadWeather = () => {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }

    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
          timezone: 'auto',
        })
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 10000)

        try {
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
            signal: controller.signal,
          })
          if (!response.ok) throw new Error('Weather service is unavailable.')

          const data: unknown = await response.json()
          if (!isRecord(data) || !isRecord(data.current)) {
            throw new Error('Weather data could not be read.')
          }
          const current = data.current
          if (
            !current ||
            !isFiniteNumber(current.temperature_2m) ||
            !isFiniteNumber(current.apparent_temperature) ||
            !isFiniteNumber(current.relative_humidity_2m) ||
            !isFiniteNumber(current.wind_speed_10m) ||
            !isFiniteNumber(current.weather_code) ||
            !Number.isInteger(current.weather_code) ||
            (current.is_day !== 0 && current.is_day !== 1)
          ) {
            throw new Error('Weather data could not be read.')
          }

          setConditions({
            temperature: current.temperature_2m,
            feelsLike: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            code: current.weather_code,
            isDay: current.is_day === 1,
          })
        } catch (cause) {
          setError(cause instanceof Error && cause.name === 'AbortError'
            ? 'Weather request timed out. Try again.'
            : cause instanceof Error
              ? cause.message
              : 'Weather could not be loaded. Try again.')
        } finally {
          window.clearTimeout(timeoutId)
          setLoading(false)
        }
      },
      (geolocationError) => {
        const message = geolocationError.code === geolocationError.PERMISSION_DENIED
          ? 'Location permission was denied. Allow it in your browser settings to see local weather.'
          : geolocationError.code === geolocationError.TIMEOUT
            ? 'Location request timed out. Try again.'
            : 'Your location could not be determined. Try again.'
        setError(message)
        setLoading(false)
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    )
  }

  return (
    <article className="dashboard-widget dashboard-widget--weather" aria-labelledby="local-weather-heading">
      <h2 className="dashboard-widget__eyebrow" id="local-weather-heading">Local weather</h2>
      {conditions ? (
        <div className="dashboard-weather">
          <div className="dashboard-weather__main">
            <div className="dashboard-weather__temperature">
              <WeatherGlyph code={conditions.code} isDay={conditions.isDay} />
              <span>{displayTemp(conditions.temperature)}°{unit}</span>
            </div>
            <strong>{weatherDescription(conditions.code, conditions.isDay)}</strong>
            <p className="dashboard-weather__location">
              <MapPinGlyph /> Using your device location
            </p>
          </div>
          <dl className="dashboard-weather__details">
            <div><dt>Humidity</dt><dd>{Math.round(conditions.humidity)}%</dd></div>
            <div><dt>Wind</dt><dd>{Math.round(conditions.windSpeed * 10) / 10} km/h</dd></div>
            <div><dt>Feels like</dt><dd>{displayTemp(conditions.feelsLike)}°{unit}</dd></div>
          </dl>
          <div className="dashboard-weather__actions" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="dashboard-weather__refresh"
              type="button"
              onClick={() => setUnit((current) => (current === 'C' ? 'F' : 'C'))}
              aria-label={`Switch temperature unit, currently degrees ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}`}
              aria-pressed={unit === 'F'}
            >
              °{unit === 'C' ? 'F' : 'C'}
            </button>
            <button className="dashboard-weather__refresh" type="button" onClick={loadWeather} disabled={loading}>
              {loading ? 'Updating…' : 'Refresh'}
            </button>
          </div>
        </div>
      ) : (
        <div className="dashboard-weather__empty">
        <WeatherGlyph code={2} isDay />
          <p>See current conditions for your area.</p>
          {error && <p className="dashboard-weather__error" role="alert">{error}</p>}
          <button type="button" onClick={loadWeather} disabled={loading}>
            {loading ? 'Finding your weather…' : 'Use my location'}
          </button>
          <span>Coordinates go to Open-Meteo for weather and are not stored by this app.</span>
        </div>
      )}
    </article>
  )
}

function FocusSessionCard() {
  const [mode, setMode] = usePersistentState<FocusModeId>('pomodoro-mode', 'work')
  const selectedMode = FOCUS_MODES.find((item) => item.id === mode) ?? FOCUS_MODES[0]
  const [remainingSeconds, setRemainingSeconds] = useState(selectedMode.duration)
  const [deadline, setDeadline] = useState<number | null>(null)
  const isRunning = deadline !== null

  useEffect(() => {
    if (deadline === null) return
    const update = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemainingSeconds(next)
      if (next === 0) setDeadline(null)
    }
    update()
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [deadline])

  const selectMode = (nextMode: FocusModeId) => {
    const next = FOCUS_MODES.find((item) => item.id === nextMode) ?? FOCUS_MODES[0]
    setMode(nextMode)
    setDeadline(null)
    setRemainingSeconds(next.duration)
  }

  const toggleTimer = () => {
    if (deadline !== null) {
      setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
      setDeadline(null)
      return
    }
    if (remainingSeconds === 0) setRemainingSeconds(selectedMode.duration)
    setDeadline(Date.now() + Math.max(remainingSeconds, 1) * 1000)
  }

  const resetTimer = () => {
    setDeadline(null)
    setRemainingSeconds(selectedMode.duration)
  }

  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0')
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0')

  return (
    <article className="dashboard-widget dashboard-widget--focus" aria-labelledby="focus-session-heading">
      <div className="dashboard-widget__heading">
        <h2 className="dashboard-widget__eyebrow" id="focus-session-heading">Focus session</h2>
        <button className="dashboard-focus__reset" type="button" onClick={resetTimer} aria-label="Reset focus timer">
          <IconSymbol kind="reset" />
        </button>
      </div>
      <p className="dashboard-focus__timer" role="timer" aria-label={`${minutes} minutes and ${seconds} seconds remaining`}>
        {minutes}:{seconds}
      </p>
      <p className="dashboard-focus__mode"><span aria-hidden="true" />{selectedMode.label}</p>
      <button className="dashboard-focus__toggle" type="button" onClick={toggleTimer}>
        <IconSymbol kind={isRunning ? 'pause' : 'play'} />
        {isRunning ? 'Pause focus' : 'Start focus'}
      </button>
      <div className="dashboard-focus__modes" role="group" aria-label="Focus timer duration">
        {FOCUS_MODES.map((item) => (
          <button
            aria-pressed={mode === item.id}
            key={item.id}
            onClick={() => selectMode(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {remainingSeconds === 0 && <p className="dashboard-focus__complete" role="status">Session complete. Take a moment to reset.</p>}
    </article>
  )
}

function weatherDescription(code: number, isDay: boolean) {
  if (code === 0) return isDay ? 'Clear sky' : 'Clear night'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Current conditions'
}

function WeatherGlyph({ code, isDay }: { code: number; isDay: boolean }) {
  const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95
  const snowy = (code >= 71 && code <= 77) || code === 85 || code === 86
  const cloudy = code >= 2 || !isDay

  return (
    <svg className="dashboard-weather__icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {cloudy ? (
        <>
          {isDay && code <= 2 && <SunRays />}
          <path d="M8.5 22.5h15a5 5 0 0 0 .2-10 8 8 0 0 0-15.1 1.7 4.2 4.2 0 0 0-.1 8.3Z" />
        </>
      ) : (
        <>
          <circle cx="16" cy="16" r="6" />
          <path d="M16 2.5v3M16 26.5v3M2.5 16h3M26.5 16h3M6.45 6.45l2.12 2.12m14.86 14.86 2.12 2.12m0-19.1-2.12 2.12M8.57 23.43l-2.12 2.12" />
        </>
      )}
      {rainy && <path d="m12 25-1 2m7-2-1 2m7-2-1 2" />}
      {snowy && <path d="M12 25v3m-1.5-1.5h3m4.5-1.5v3m-1.5-1.5h3m4.5-1.5v3m-1.5-1.5h3" />}
      {code >= 95 && <path d="m17 19-3 5h4l-2 5" />}
      {code === 45 || code === 48 ? <path d="M7 26h18M9 29h14" /> : null}
    </svg>
  )
}

function SunRays() {
  return (
    <g>
      <circle cx="12" cy="10" r="3.5" />
      <path d="M12 2v2m0 12v2m-8-8h2m12 0h2M6.35 4.35l1.4 1.4m8.5 8.5 1.4 1.4m0-11.3-1.4 1.4m-8.5 8.5-1.4 1.4" />
    </g>
  )
}

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  )
}

function IconSymbol({ kind }: { kind: 'play' | 'pause' | 'reset' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'play' && <path d="m7 4.5 9 5.5-9 5.5z" />}
      {kind === 'pause' && <path d="M7 5v10m6-10v10" />}
      {kind === 'reset' && <path d="M3.5 9a6.5 6.5 0 1 1 1.7 5.1M3.5 4.5V9h4.5" />}
    </svg>
  )
}
