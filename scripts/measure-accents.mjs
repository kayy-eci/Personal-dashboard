/**
 * Contrast measurement for the six accent presets.
 *
 * Run: node scripts/measure-accents.mjs
 *
 * Prints the measured ratios that back the numbers quoted in the Design
 * tokens section of the accessibility report. Not imported by the app.
 */

function hexToRgb(hex) {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(foreground, background) {
  const a = luminance(foreground)
  const b = luminance(background)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/** Light-theme surface the accent text is painted on. */
const LIGHT_SURFACE = '#ffffff'
const LIGHT_PAGE = '#fafaf7'
/** Dark-theme surfaces (page background and card). */
const DARK_PAGE = '#151715'
const DARK_SURFACE = '#1d201c'

/** Light variants double as the filled button colour (white label). */
const LIGHT = {
  violet: { fill: '#6D28D9', text: '#5B21B6' },
  blue: { fill: '#1D4ED8', text: '#1E40AF' },
  teal: { fill: '#0F766E', text: '#115E59' },
  green: { fill: '#15803D', text: '#166534' },
  rose: { fill: '#BE123C', text: '#9F1239' },
  slate: { fill: '#475569', text: '#334155' },
}

/**
 * Dark variants: filled buttons keep a white label, text stays legible on dark
 * surfaces. Teal and green stay deep in dark theme because their brighter
 * siblings drop below 4.5:1 against a white label; the bright text variant
 * still supplies the 3:1 control boundary on the button's outline.
 */
const DARK = {
  violet: { fill: '#7C3AED', text: '#C4B5FD' },
  blue: { fill: '#2563EB', text: '#93C5FD' },
  teal: { fill: '#0F766E', text: '#5EEAD4' },
  green: { fill: '#15803D', text: '#86EFAC' },
  rose: { fill: '#E11D48', text: '#FDA4AF' },
  slate: { fill: '#64748B', text: '#CBD5E1' },
}

const rows = []
for (const name of Object.keys(LIGHT)) {
  const light = LIGHT[name]
  const dark = DARK[name]
  rows.push({
    accent: name,
    'light fill / white label': contrast('#ffffff', light.fill).toFixed(2),
    'light text / surface': contrast(light.text, LIGHT_SURFACE).toFixed(2),
    'light text / page': contrast(light.text, LIGHT_PAGE).toFixed(2),
    'light ring / page': contrast(light.fill, LIGHT_PAGE).toFixed(2),
    'dark fill / white label': contrast('#ffffff', dark.fill).toFixed(2),
    'dark text / surface': contrast(dark.text, DARK_SURFACE).toFixed(2),
    'dark text / page': contrast(dark.text, DARK_PAGE).toFixed(2),
    'dark ring / page': contrast(dark.text, DARK_PAGE).toFixed(2),
    'dark fill / page': contrast(dark.fill, DARK_PAGE).toFixed(2),
  })
}

console.table(rows)

console.log('\nNeutral text (unchanged by accent):')
for (const [label, fg, bg] of [
  ['light text / page', '#1c1c1a', LIGHT_PAGE],
  ['light muted / surface', '#5f625d', LIGHT_SURFACE],
  ['light faint / surface', '#6b6f68', LIGHT_SURFACE],
  ['dark text / page', '#f1f2ed', DARK_PAGE],
  ['dark muted / surface', '#b3b8ad', DARK_SURFACE],
  ['dark faint / surface', '#9aa093', DARK_SURFACE],
]) {
  console.log(`  ${label}: ${contrast(fg, bg).toFixed(2)}`)
}

console.log('\nSemantic colours (never accent-derived):')
for (const [label, fg, bg] of [
  ['light vitality / surface', '#0f7a55', LIGHT_SURFACE],
  ['light xp / surface', '#6b7f12', LIGHT_SURFACE],
  ['light danger / surface', '#b42318', LIGHT_SURFACE],
  ['dark vitality / surface', '#4ade9c', DARK_SURFACE],
  ['dark xp / surface', '#c3e04a', DARK_SURFACE],
  ['dark danger / surface', '#fca5a5', DARK_SURFACE],
]) {
  console.log(`  ${label}: ${contrast(fg, bg).toFixed(2)}`)
}
