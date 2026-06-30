// ── INICIO: tests pointerState ──
import { describe, expect, it } from 'vitest'
import {
  DRAG_THRESHOLD_PX,
  exceededDragThreshold,
  isAdditive,
  modifiersOf,
  rectBetween,
} from '../src/canvas/internals/pointerState.js'

describe('modifiersOf', () => {
  it('normaliza shift/ctrl/meta/alt', () => {
    const mods = modifiersOf({ shiftKey: true, ctrlKey: false, metaKey: true, altKey: false })
    expect(mods.shift).toBe(true)
    expect(mods.ctrl).toBe(false)
    expect(mods.meta).toBe(true)
    expect(mods.alt).toBe(false)
  })
})

describe('isAdditive', () => {
  it('shift → true', () => {
    expect(isAdditive({ shift: true, ctrl: false, meta: false, alt: false })).toBe(true)
  })
  it('ctrl → true', () => {
    expect(isAdditive({ shift: false, ctrl: true, meta: false, alt: false })).toBe(true)
  })
  it('meta → true', () => {
    expect(isAdditive({ shift: false, ctrl: false, meta: true, alt: false })).toBe(true)
  })
  it('alt-only → false (alt non é additive)', () => {
    expect(isAdditive({ shift: false, ctrl: false, meta: false, alt: true })).toBe(false)
  })
  it('ningún → false', () => {
    expect(isAdditive({ shift: false, ctrl: false, meta: false, alt: false })).toBe(false)
  })
})

describe('exceededDragThreshold', () => {
  it('mesmo punto → false', () => {
    expect(exceededDragThreshold(100, 100, 100, 100)).toBe(false)
  })
  it('desprazamento subliminal → false', () => {
    // DRAG_THRESHOLD_PX = 4 → 4*4=16; cunha distancia 3 (dx=3, dy=0 → 9<16) é subliminal.
    expect(exceededDragThreshold(100, 100, 103, 100)).toBe(false)
  })
  it('desprazamento exacto no limiar → true', () => {
    // dx=4 → 16>=16
    expect(exceededDragThreshold(100, 100, 100 + DRAG_THRESHOLD_PX, 100)).toBe(true)
  })
  it('desprazamento amplo → true', () => {
    expect(exceededDragThreshold(0, 0, 100, 100)).toBe(true)
  })
})

describe('rectBetween', () => {
  it('puntos canónicos (top-left → bottom-right)', () => {
    expect(rectBetween({ x: 10, y: 20 }, { x: 50, y: 80 })).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 60,
    })
  })
  it('puntos invertidos (bottom-right → top-left)', () => {
    expect(rectBetween({ x: 50, y: 80 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 60,
    })
  })
  it('mesma posición → rect 0×0', () => {
    expect(rectBetween({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({
      x: 10,
      y: 10,
      width: 0,
      height: 0,
    })
  })
})
// ── FIN: tests pointerState ──
