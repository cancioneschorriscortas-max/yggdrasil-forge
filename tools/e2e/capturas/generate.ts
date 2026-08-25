import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  boot,
  canvasPoint,
  importTree,
  newDoc,
  nodeScreenCenter,
  setMode,
  tool,
  visibleCanvasRect,
} from './helpers'

// ── O xerador de capturas da guía visual (17.5) ──
// Cada escena é un test: arranca limpo, chega ao estado didáctico e
// garda UN PNG con nome estable en docs-site/src/assets/capturas/.
// Se un fluxo rompe, a UI rompeu: as capturas son tamén sentinela.
//
// Regra: recorte intelixente — a zona que ensina UN concepto, non
// sempre a pantalla enteira. Tema marfil (por defecto); o escuro
// queda fóra da v1 (decisión do briefing).

const OUT = path.resolve(__dirname, '../../../docs-site/src/assets/capturas')
const PANADEIRO = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../examples/gallery/panadeiro.json'), 'utf8'),
)

function out(name: string): string {
  return path.join(OUT, name)
}

/** Screenshot dun rectángulo de pantalla. */
async function clipShot(
  page: import('@playwright/test').Page,
  name: string,
  clip: { x: number; y: number; width: number; height: number },
): Promise<void> {
  await page.screenshot({ path: out(name), clip, animations: 'disabled' })
}

test('01 — o editor recén aberto (as zonas)', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.screenshot({ path: out('01-editor.png'), animations: 'disabled' })
})

test('02 — menú Ficheiro aberto', async ({ page }) => {
  await boot(page)
  await page.locator('button[aria-label="Ficheiro"]').click()
  await expect(page.locator('[role="menu"]')).toBeVisible()
  await clipShot(page, '02-ficheiro.png', { x: 0, y: 0, width: 560, height: 430 })
})

test('03 — tool Engadir: un nodo nacendo', async ({ page }) => {
  await boot(page)
  await newDoc(page)
  await tool(page, 'n')
  const p = await canvasPoint(page, 0.5, 0.45)
  await page.mouse.click(p.x, p.y)
  const r = await visibleCanvasRect(page)
  await clipShot(page, '03-engadir.png', r)
})

test('04 — conectar: a liña fantasma a medio xesto', async ({ page }) => {
  await boot(page)
  await newDoc(page)
  await tool(page, 'n')
  const a = await canvasPoint(page, 0.32, 0.5)
  const b = await canvasPoint(page, 0.68, 0.5)
  await page.mouse.click(a.x, a.y)
  await page.mouse.click(b.x, b.y)
  await tool(page, 'c')
  await page.mouse.click(a.x, a.y)
  // A MEDIO xesto: o rato de camiño ao segundo nodo, sen soltar o clic
  // final — o valor didáctico está na liña fantasma seguindo o rato.
  await page.mouse.move((a.x + b.x) / 2, a.y - 40, { steps: 8 })
  const r = await visibleCanvasRect(page)
  await clipShot(page, '04-conexion.png', r)
})

test('05 — Inspector cun nodo rico', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  const c = await nodeScreenCenter(page, 'masa_dulce')
  await page.mouse.click(c.x, c.y)
  const inspector = page.locator('.editor-inspector')
  await expect(inspector).toBeVisible()
  await inspector.screenshot({ path: out('05-inspector.png'), animations: 'disabled' })
})

test('06 — o selector de iconas', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  const c = await nodeScreenCenter(page, 'masa_dulce')
  await page.mouse.click(c.x, c.y)
  await page.getByRole('button', { name: 'Escoller icona' }).click()
  const picker = page.getByRole('dialog', { name: 'Selector de iconas' })
  await expect(picker).toBeVisible()
  // Co buscador en acción e o set LOGIC á vista (briefing: escena 6).
  await picker.getByRole('searchbox', { name: 'Buscar icona' }).fill('logic')
  await expect(picker.locator('button', { hasText: 'logic-key' })).toBeVisible()
  await picker.screenshot({ path: out('06-iconas.png'), animations: 'disabled' })
})

test('07 — pestana Tema cos presets', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.locator('.dv-tab', { hasText: 'Tema' }).click()
  const panel = page.locator('.editor-theme-panel')
  await expect(panel).toBeVisible()
  await panel.screenshot({ path: out('07-tema.png'), animations: 'disabled' })
})

test('08 — menú Dispor coas axudas', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.getByRole('button', { name: 'Dispor' }).click()
  const menu = page.locator('[role="menu"]')
  await expect(menu).toBeVisible()
  await menu.screenshot({ path: out('08-dispor.png'), animations: 'disabled' })
})

test('09 — modo Proba coa ficha e os recursos', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await setMode(page, 'Proba')
  const c = await nodeScreenCenter(page, 'masa_dulce')
  await page.mouse.click(c.x, c.y)
  await page.screenshot({ path: out('09-proba.png'), animations: 'disabled' })
})

test('10 — vista tarxetas', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.getByRole('button', { name: 'tarxetas' }).click()
  const cards = page.locator('.yf-cluster-cards')
  await expect(cards).toBeVisible()
  await cards.screenshot({ path: out('10-tarxetas.png'), animations: 'disabled' })
})

test('11 — panel Código coa lenda de cores', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.locator('.dv-tab', { hasText: 'Código' }).click()
  const panel = page.locator('.editor-code')
  await expect(panel.locator('.cm-editor')).toBeVisible()
  await panel.screenshot({ path: out('11-codigo.png'), animations: 'disabled' })
})

test('12 — exportar imaxe (menú Ficheiro)', async ({ page }) => {
  await boot(page)
  await importTree(page, PANADEIRO)
  await page.locator('button[aria-label="Ficheiro"]').click()
  const menu = page.locator('[role="menu"]')
  await expect(menu.getByRole('menuitem', { name: /Exportar imaxe \(PNG/ })).toBeVisible()
  await menu.screenshot({ path: out('12-exportar.png'), animations: 'disabled' })
})

test('13 — o banner de recuperación (autosave)', async ({ page }) => {
  await boot(page)
  await newDoc(page)
  await tool(page, 'n')
  const p = await canvasPoint(page, 0.5, 0.5)
  await page.mouse.click(p.x, p.y)
  // Debounce do autosave (1s) + marxe, e recarga SEN limpar localStorage.
  await page.waitForTimeout(1400)
  await page.reload()
  const banner = page.getByRole('alertdialog', { name: 'Recuperación de traballo' })
  await expect(banner).toBeVisible()
  await banner.screenshot({ path: out('13-recuperacion.png'), animations: 'disabled' })
})

test('14 — Problemas con «Ver no código»', async ({ page }) => {
  await boot(page)
  // Exclusión asimétrica: warning NON-bloqueante (A.6.30) → aparece
  // no panel Problemas co botón «Ver no código» (15.6).
  const doc = structuredClone(PANADEIRO)
  doc.tree.nodes[0].exclusions = [doc.tree.nodes[1].id]
  await importTree(page, doc)
  const problems = page.locator('.editor-problems')
  await expect(problems.locator('[aria-label^="Ver no código"]').first()).toBeVisible()
  await problems.screenshot({ path: out('14-problemas.png'), animations: 'disabled' })
})
