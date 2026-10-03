import { describe, expect, it } from 'vitest'
import { applyAttributeCap, applyTrivialCap } from '../../src/core/domain/caps'

describe('attribute daily soft cap', () => {
  it('under the cap applies nothing', () => {
    expect(applyAttributeCap(100, 0)).toEqual({ final: 100, cap: null })
  })
  it('crossing the cap in one award splits proportionally', () => {
    const r = applyAttributeCap(100, 100)
    // 50 uncapped + 50*0.5 = 75
    expect(r.final).toBe(75)
    expect(r.cap?.rule).toBe('attribute_daily_soft_cap')
  })
  it('already at cap: everything halved', () => {
    expect(applyAttributeCap(40, 150).final).toBe(20)
    expect(applyAttributeCap(1, 200).final).toBe(1) // minimum 1
  })
})

describe('trivial quests', () => {
  it('first 3 full, then halved', () => {
    expect(applyTrivialCap(30, 0).final).toBe(30)
    expect(applyTrivialCap(30, 2).final).toBe(30)
    expect(applyTrivialCap(30, 3).final).toBe(15)
    expect(applyTrivialCap(30, 9).final).toBe(15)
  })
})
