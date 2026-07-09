// ── INICIO: tests toggleTag (briefing 7.13 Cambio 1) ──

import { describe, expect, it } from 'vitest'
import { toggleTag } from '../src/command/composites.js'

describe('★ 7.13 — toggleTag', () => {
  it('engadir a un array existente', () => {
    expect(toggleTag(['a'], 'b', true)).toEqual(['a', 'b'])
  })

  it('engadir cando tags é undefined → array novo con só ese tag', () => {
    expect(toggleTag(undefined, 'a', true)).toEqual(['a'])
  })

  it('★ engadir un tag xa presente é idempotente (mesma referencia, sen duplicar)', () => {
    const tags = ['a', 'b']
    const result = toggleTag(tags, 'a', true)
    expect(result).toBe(tags) // mesma referencia — sen cambios reais
    expect(result).toEqual(['a', 'b'])
  })

  it('quitar un tag presente', () => {
    expect(toggleTag(['a', 'b', 'c'], 'b', false)).toEqual(['a', 'c'])
  })

  it('★ quitar deixando o array baleiro → undefined (non [])', () => {
    expect(toggleTag(['a'], 'a', false)).toBeUndefined()
  })

  it('★ quitar dun tags undefined é idempotente (undefined, non [])', () => {
    expect(toggleTag(undefined, 'a', false)).toBeUndefined()
  })

  it('★ quitar un tag ausente é idempotente (mesma referencia)', () => {
    const tags = ['a', 'b']
    const result = toggleTag(tags, 'z', false)
    expect(result).toBe(tags)
  })

  it('preserva tags alleas ao engadir', () => {
    expect(toggleTag(['guerreiro', 'norte'], 'sur', true)).toEqual(['guerreiro', 'norte', 'sur'])
  })

  it('preserva tags alleas ao quitar', () => {
    expect(toggleTag(['guerreiro', 'norte', 'sur'], 'norte', false)).toEqual(['guerreiro', 'sur'])
  })

  it('preserva a orde orixinal', () => {
    expect(toggleTag(['z', 'a', 'm'], 'b', true)).toEqual(['z', 'a', 'm', 'b'])
  })
})
// ── FIN: tests toggleTag ──
