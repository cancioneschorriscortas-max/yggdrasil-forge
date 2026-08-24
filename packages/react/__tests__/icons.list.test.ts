// ── INICIO: tests listRegisteredIcons (15.5, Cambio 1) ──
// A peza que lle faltaba ao rexistro: enumerar. Nota de contrato: o
// caso "rexistro baleiro" é INALCANZABLE por deseño — os BUILTIN_ICONS
// auto-rexístranse ao cargar o módulo (fix-tree-shake de F10.5); a
// liña base honesta é "só builtins".
import { describe, expect, it } from 'vitest'
import { LOGIC_ICONS } from '../src/icons/logic.js'
import { NORSE_ICONS } from '../src/icons/norse.js'
import { BUILTIN_ICONS, listRegisteredIcons, registerIcons } from '../src/icons/registry.js'

describe('listRegisteredIcons (15.5)', () => {
  it('liña base: só os builtins (o baleiro é inalcanzable por deseño)', () => {
    const ids = listRegisteredIcons().map((e) => e.id)
    expect(ids).toEqual(Object.keys(BUILTIN_ICONS).sort((a, b) => a.localeCompare(b)))
  })

  it('★ tras registerIcons(NORSE+LOGIC): contén ambos, ordenado por id', () => {
    registerIcons(NORSE_ICONS)
    registerIcons(LOGIC_ICONS)
    const list = listRegisteredIcons()
    const ids = list.map((e) => e.id)
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)))
    expect(list).toHaveLength(
      Object.keys(BUILTIN_ICONS).length +
        Object.keys(NORSE_ICONS).length +
        Object.keys(LOGIC_ICONS).length,
    )
    expect(ids).toContain('norse-wolf')
    expect(ids).toContain('logic-key')
    // As defs son as reais, non copias mutadas.
    expect(list.find((e) => e.id === 'logic-key')?.def).toEqual(LOGIC_ICONS['logic-key'])
  })

  it('re-rexistrar non duplica (last-write-wins)', () => {
    registerIcons(LOGIC_ICONS)
    const before = listRegisteredIcons().length
    registerIcons(LOGIC_ICONS)
    expect(listRegisteredIcons().length).toBe(before)
  })

  it('devolve copia: mutar o resultado non toca o rexistro', () => {
    const list = listRegisteredIcons() as Array<{ id: string; def: unknown }>
    const before = list.length
    list.pop()
    expect(listRegisteredIcons().length).toBe(before)
  })
})
// ── FIN: tests listRegisteredIcons ──
