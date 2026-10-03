// One-off analysis: decode design/image.png (RGBA, non-interlaced) and report
// average colors on a coarse grid + dominant colors per region.
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const buf = readFileSync('design/image.png')

function readU32(off) { return buf.readUInt32BE(off) }
let off = 8
let width = 0, height = 0, bitDepth = 0, colorType = 0
const idat = []
while (off < buf.length) {
  const len = readU32(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  const data = buf.subarray(off + 8, off + 8 + len)
  if (type === 'IHDR') {
    width = readU32(off + 8); height = readU32(off + 12)
    bitDepth = buf[off + 16]; colorType = buf[off + 17]
  } else if (type === 'IDAT') idat.push(data)
  else if (type === 'IEND') break
  off += 12 + len
}
if (bitDepth !== 8) throw new Error(`bitDepth ${bitDepth} unsupported`)
const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : null
if (!channels) throw new Error(`colorType ${colorType} unsupported`)

const raw = inflateSync(Buffer.concat(idat))
const stride = width * channels
const px = Buffer.alloc(height * stride)
// Un-filter
for (let y = 0; y < height; y++) {
  const f = raw[y * (stride + 1)]
  const rowStart = y * (stride + 1) + 1
  const outStart = y * stride
  for (let x = 0; x < stride; x++) {
    const rawX = raw[rowStart + x]
    const a = x >= channels ? px[outStart + x - channels] : 0
    const b = y > 0 ? px[outStart - stride + x] : 0
    const c = (x >= channels && y > 0) ? px[outStart - stride + x - channels] : 0
    let val
    if (f === 0) val = rawX
    else if (f === 1) val = rawX + a
    else if (f === 2) val = rawX + b
    else if (f === 3) val = rawX + Math.floor((a + b) / 2)
    else if (f === 4) {
      const p = a + b - c
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
      val = rawX + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
    } else throw new Error(`filter ${f}`)
    px[outStart + x] = val & 0xff
  }
}

const get = (x, y) => {
  const i = y * stride + x * channels
  return [px[i], px[i + 1], channels >= 3 ? px[i + 2] : px[i]]
}
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

// 16x10 grid of average colors (opaque pixels only)
const COLS = 16, ROWS = 10
console.log(`PNG ${width}x${height} colorType=${colorType}`)
const rows = []
for (let gr = 0; gr < ROWS; gr++) {
  const cells = []
  for (let gc = 0; gc < COLS; gc++) {
    const x0 = Math.floor(gc * width / COLS), x1 = Math.floor((gc + 1) * width / COLS)
    const y0 = Math.floor(gr * height / ROWS), y1 = Math.floor((gr + 1) * height / ROWS)
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const [pr, pg, pb] = get(x, y)
      r += pr; g += pg; b += pb; n++
    }
    cells.push(hex([Math.round(r / n), Math.round(g / n), Math.round(b / n)]))
  }
  rows.push(cells.join(' '))
}
console.log('\nAverage color grid (16 cols x 10 rows):')
rows.forEach((r, i) => console.log(`r${i}: ${r}`))

// Dominant quantized colors overall and for left 240px (sidebar) vs rest
function dominant(x0, x1, label) {
  const counts = new Map()
  for (let y = 0; y < height; y += 3) for (let x = x0; x < x1; x += 3) {
    const [r, g, b] = get(x, y)
    // quantize to 24 levels to merge near-identical colors
    const q = `${Math.round(r / 10)},${Math.round(g / 10)},${Math.round(b / 10)}`
    counts.set(q, (counts.get(q) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([q, n]) => {
      const [r, g, b] = q.split(',').map(v => Math.min(255, v * 10))
      return `${hex([r, g, b])} ${(100 * n / ((x1 - x0) / 3 * (height / 3))).toFixed(1)}%`
    })
  console.log(`\nDominant colors ${label}: ${top.join(', ')}`)
}
dominant(0, 260, 'sidebar (x 0-260)')
dominant(280, width - 10, 'content (x 280+)')
