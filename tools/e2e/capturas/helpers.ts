import { type Page, expect } from '@playwright/test'

// ── Helpers do xerador de capturas ──
// Copias RECORTADAS dos helpers do E2E do Tester (tests/helpers.ts,
// non commiteado): este directorio commitéase e non pode depender de
// código ignorado. Se un selector cambia, cambia aquí e alí.

export const CANVAS = 'svg.yf-skill-tree'
export const NODES_GROUP = 'svg.yf-skill-tree .yf-skill-nodes'

/** Arranca o editor cunha disposición LIMPA e determinista. */
export async function boot(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.locator(CANVAS).first().waitFor({ state: 'visible' })
  await page.locator(NODES_GROUP).first().waitFor({ state: 'attached' })
}

/** Número de nodos segundo a barra de estado. */
export async function nodeCount(page: Page): Promise<number> {
  const txt = (await page.locator('[aria-label="node count"]').innerText()).trim()
  return Number.parseInt(txt.replace(/\D+/g, ''), 10)
}

/** Rectángulo VISIBLE do canvas (o SVG desbórdase do seu panel). */
export async function visibleCanvasRect(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return page.evaluate(() => {
    const svg = document.querySelector('svg.yf-skill-tree') as SVGSVGElement
    const sr = svg.getBoundingClientRect()
    let top = sr.top
    let bottom = sr.bottom
    let left = sr.left
    let right = sr.right
    let el: HTMLElement | null = svg.parentElement
    while (el !== null) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (cs.overflowY !== 'visible' || cs.overflow !== 'visible') {
        top = Math.max(top, r.top)
        bottom = Math.min(bottom, r.bottom)
      }
      if (cs.overflowX !== 'visible' || cs.overflow !== 'visible') {
        left = Math.max(left, r.left)
        right = Math.min(right, r.right)
      }
      el = el.parentElement
    }
    return { x: left, y: top, width: right - left, height: bottom - top }
  })
}

/** Punto de pantalla dentro do canvas visible, por fracción (0..1). */
export async function canvasPoint(
  page: Page,
  fx: number,
  fy: number,
): Promise<{ x: number; y: number }> {
  const r = await visibleCanvasRect(page)
  return { x: r.x + r.width * fx, y: r.y + r.height * fy }
}

/** Centro en pantalla dun nodo (por data-node-id). */
export async function nodeScreenCenter(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = await page
    .locator(`[data-node-id="${id.replace(/["\\]/g, '\\$&')}"]`)
    .first()
    .boundingBox()
  if (box === null) throw new Error(`nodo ${id} sen boundingBox`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Selecciona ferramenta por atallo de teclado (v/n/c). */
export async function tool(page: Page, key: 'v' | 'n' | 'c'): Promise<void> {
  // Clic de desenfoque para que o atallo non caia nun input.
  await page
    .locator('body')
    .click({ position: { x: 5, y: 5 } })
    .catch(() => undefined)
  await page.keyboard.press(key)
}

/** Abre o menú Ficheiro e preme unha entrada. */
export async function fileMenu(page: Page, item: string): Promise<void> {
  await page.locator('button[aria-label="Ficheiro"]').click()
  await page.locator(`[role="menu"] >> text=${item}`).click()
}

/** Documento novo (baleiro). Acepta o confirm de substitución. */
export async function newDoc(page: Page): Promise<void> {
  page.once('dialog', (d) => void d.accept())
  await fileMenu(page, 'Novo')
  await expect.poll(() => nodeCount(page)).toBe(0)
}

/** Importa un obxecto JSON via o input de ficheiro oculto. */
export async function importTree(page: Page, obj: unknown): Promise<void> {
  page.once('dialog', (d) => void d.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(obj), 'utf8'),
  })
  await expect.poll(() => nodeCount(page)).toBeGreaterThan(0)
}

/** Cambia a modo Proba / Autoría polos botóns do TopBar. */
export async function setMode(page: Page, mode: 'Autoría' | 'Proba'): Promise<void> {
  await page.locator('[aria-label="mode"] button', { hasText: mode }).click()
}
