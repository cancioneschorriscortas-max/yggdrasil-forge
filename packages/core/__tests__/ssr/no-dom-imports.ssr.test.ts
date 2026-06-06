import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// __tests__/ssr/no-dom-imports.ssr.test.ts → ../../src/
const HERE = fileURLToPath(new URL('.', import.meta.url))
const SRC_ROOT = join(HERE, '..', '..', 'src')

/** Recolle recursivamente ficheiros .ts (excluindo tests e type-tests). */
function walkTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      results.push(...walkTsFiles(full))
    } else if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.type-test.ts')
    ) {
      results.push(full)
    }
  }
  return results
}

/** Determina se unha liña é un comentario ou está baleira. */
function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed === '' ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*')
  )
}

/** Escanea ficheiros buscando un patrón regex, excluindo comentarios. */
function findViolations(files: string[], pattern: RegExp): string[] {
  const violations: string[] = []
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx]
      if (line === undefined || isCommentOrEmpty(line)) continue
      if (pattern.test(line)) {
        violations.push(`${file}:${idx + 1}: ${line.trim()}`)
      }
    }
  }
  return violations
}

describe('SSR regression guard: cero uso de DOM globals en packages/core/src/', () => {
  it('walkTsFiles encontra ficheiros TypeScript en src/', () => {
    const files = walkTsFiles(SRC_ROOT)
    expect(files.length).toBeGreaterThan(10)
  })

  it('cero ficheiro de src/ accede a window.* (excepto comentarios)', () => {
    const violations = findViolations(walkTsFiles(SRC_ROOT), /\bwindow\s*\./)
    expect(violations).toEqual([])
  })

  it('cero ficheiro de src/ accede a document.* (excepto comentarios)', () => {
    const violations = findViolations(walkTsFiles(SRC_ROOT), /\bdocument\s*\./)
    expect(violations).toEqual([])
  })

  it('cero ficheiro de src/ accede a navigator.* (excepto comentarios)', () => {
    const violations = findViolations(walkTsFiles(SRC_ROOT), /\bnavigator\s*\./)
    expect(violations).toEqual([])
  })
})
