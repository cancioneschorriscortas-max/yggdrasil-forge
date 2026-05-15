#!/usr/bin/env bash
set -e

# ── 1. deepClone.ts simplificado ──
python3 -c "
content = '''// ── INICIO: deepClone ──
// Clon profundo de valores usando structuredClone nativo.

/**
 * Crea un clon profundo dun valor.
 *
 * Usa \`structuredClone\` nativo, dispoñible en Node 17+ e navegadores modernos
 * (Chrome 98+, Firefox 94+, Safari 15.4+). O proxecto require Node 22+ e
 * navegadores aínda máis recentes (ver MASTER.md sec. 51), polo que está
 * sempre dispoñible.
 *
 * Limitacións de structuredClone:
 * - Non clona funcións, símbolos nin protocolos custom (comportamento esperado
 *   para datos serializables)
 * - Lanza DataCloneError se o valor contén algo non clonable
 *
 * @example
 * const original = { a: 1, nested: { b: [1, 2, 3] } }
 * const copy = deepClone(original)
 * copy.nested.b.push(4)  // non afecta a original
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== \'object\') {
    return value
  }
  return structuredClone(value)
}
// ── FIN: deepClone ──
'''
open('packages/core/src/utils/deepClone.ts', 'w', encoding='utf-8', newline='\n').write(content)
print('deepClone.ts OK')
"

# ── 2. utils/index.ts sen deepCloneManual ──
python3 -c "
content = '''// ── INICIO: utils public API ──
// Utilidades internas de @yggdrasil-forge/core.
// Estas funcións son de uso interno; non forman parte da API pública estable.

export { deepClone } from \'./deepClone.js\'
export { deepEqual } from \'./deepEqual.js\'
export { generateId, resetIdCounter } from \'./generateId.js\'
export { isPlainObject, clamp } from \'./guards.js\'
// ── FIN: utils public API ──
'''
open('packages/core/src/utils/index.ts', 'w', encoding='utf-8', newline='\n').write(content)
print('utils/index.ts OK')
"

# ── 3. Tests: eliminar describe de deepCloneManual, manter describe de deepClone ──
python3 -c "
content = '''// ── INICIO: tests de deepClone ──
import { describe, expect, it } from \'vitest\'
import { deepClone } from \'../../src/utils/index.js\'

describe(\'deepClone\', () => {
  it(\'clones primitives as-is\', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone(\'hello\')).toBe(\'hello\')
    expect(deepClone(true)).toBe(true)
    expect(deepClone(null)).toBe(null)
    expect(deepClone(undefined)).toBe(undefined)
  })

  it(\'clones flat objects\', () => {
    const original = { a: 1, b: \'two\', c: true }
    const copy = deepClone(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
  })

  it(\'clones nested objects deeply\', () => {
    const original = { a: { b: { c: 1 } } }
    const copy = deepClone(original)
    copy.a.b.c = 999
    expect(original.a.b.c).toBe(1)
  })

  it(\'clones arrays deeply\', () => {
    const original = [1, [2, 3], [[4]]]
    const copy = deepClone(original)
    ;(copy[1] as number[]).push(999)
    expect((original[1] as number[]).length).toBe(2)
  })

  it(\'clones objects with array properties\', () => {
    const original = { tags: [\'a\', \'b\'], nested: { items: [1, 2] } }
    const copy = deepClone(original)
    copy.tags.push(\'c\')
    copy.nested.items.push(3)
    expect(original.tags).toEqual([\'a\', \'b\'])
    expect(original.nested.items).toEqual([1, 2])
  })

  it(\'clones Date objects\', () => {
    const original = { created: new Date(\'2026-01-01\') }
    const copy = deepClone(original)
    expect(copy.created.getTime()).toBe(original.created.getTime())
    expect(copy.created).not.toBe(original.created)
  })

  it(\'clones Map objects\', () => {
    const original = new Map([[\'key\', { value: 1 }]])
    const copy = deepClone(original)
    const copiedVal = copy.get(\'key\') as { value: number }
    copiedVal.value = 999
    expect((original.get(\'key\') as { value: number }).value).toBe(1)
  })

  it(\'clones Set objects\', () => {
    const original = new Set([1, 2, 3])
    const copy = deepClone(original)
    copy.add(4)
    expect(original.size).toBe(3)
  })
})
// ── FIN: tests de deepClone ──
'''
open('packages/core/__tests__/utils/deepClone.test.ts', 'w', encoding='utf-8', newline='\n').write(content)
print('deepClone.test.ts OK')
"

# ── 4. CHANGELOG ──
python3 -c "
import re
path = 'CHANGELOG.md'
text = open(path, encoding='utf-8').read()
entry = '''### Changed
- \`deepClone\` simplified to use only \`structuredClone\` (guaranteed in Node 22+ and modern browsers per target). Removed \`deepCloneManual\` fallback (resolves technical debt DT-1).

'''
# Insire despois da liña [Unreleased]
text = re.sub(r'(\[Unreleased\][^\n]*\n)', r'\1\n' + entry, text, count=1)
open(path, 'w', encoding='utf-8', newline='\n').write(text)
print('CHANGELOG.md OK')
"

echo ""
echo "✅ Ficheiros actualizados. Executa:"
echo "   pnpm lint:fix && pnpm format && pnpm lint && pnpm typecheck && pnpm build && pnpm test"
echo "   pnpm --filter @yggdrasil-forge/core test:coverage"
echo "   pnpm validate"
