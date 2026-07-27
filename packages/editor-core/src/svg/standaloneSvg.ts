// ── INICIO: standaloneSvg (7.17) ──
// Postprocesado de AUTOCONTENCIÓN dun SVG de árbore: a única fonte
// para o export do editor (Cambio 1) e para `ygg render` (Cambio 2).
//
// Que garante o resultado:
//   - `xmlns` presente (o SVG ábrese só, fóra de calquera HTML).
//   - `width`/`height` explícitos derivados do viewBox (ou de `width`
//     pedido, mantendo o aspecto) — determinista, a árbore ENTEIRA.
//   - Un `<rect>` de fondo coa cor pedida, pintado PRIMEIRO.
//   - `font-family` embebida no raíz (as labels non dependen do CSS
//     da páxina).
//   - CERO `var(--…)`: se o markup trae variables CSS sen resolver,
//     é un erro do chamador — devolvémolo como erro honesto, non un
//     ficheiro que "se verá mal nalgún visor".
//
// Traballa sobre TEXTO (string): os dous produtores (XMLSerializer no
// navegador; renderToStaticMarkup no CLI) emiten un raíz `<svg …>`
// ben formado, que é o único que se manipula.

import type { Result } from '@yggdrasil-forge/core'
import { ErrorCode, YggdrasilError, err, ok } from '@yggdrasil-forge/core'

export interface StandaloneSvgOptions {
  /** Cor do rect de fondo. Sen ela, sen fondo (transparente). */
  readonly background?: string
  /** Ancho de saída en px; a altura sae do aspecto do viewBox. */
  readonly width?: number
  /** font-family embebida no raíz. Default: pila de sistema. */
  readonly fontFamily?: string
}

const DEFAULT_FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

/** Convirte o markup dun `<svg>` de árbore nun ficheiro autocontido. */
export function standaloneSvg(markup: string, options: StandaloneSvgOptions = {}): Result<string> {
  if (markup.includes('var(--')) {
    return err(
      new YggdrasilError(
        ErrorCode.INVALID_TREE_DEF,
        'o SVG trae variables CSS sen resolver (var(--…)) — o export non sería autocontido',
      ),
    )
  }

  const openTagMatch = /<svg\b[^>]*>/.exec(markup)
  if (openTagMatch === null) {
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, 'markup sen elemento <svg> raíz'))
  }
  let openTag = openTagMatch[0]

  const viewBoxMatch = /viewBox="([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)"/.exec(
    openTag,
  )
  if (viewBoxMatch === null) {
    return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, 'o <svg> raíz non ten viewBox'))
  }
  const [, minX, minY, vbWidth, vbHeight] = viewBoxMatch.map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ]
  if (!(vbWidth > 0) || !(vbHeight > 0)) {
    return err(
      new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `viewBox dexenerado (${vbWidth}×${vbHeight})`),
    )
  }

  // 1) xmlns (o XMLSerializer do navegador xa o pon; renderToStaticMarkup non sempre).
  if (!openTag.includes('xmlns=')) {
    openTag = openTag.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  // 2) width/height explícitos (quitamos os previos, poñemos os derivados).
  const outWidth = options.width !== undefined ? Math.max(1, Math.round(options.width)) : vbWidth
  const outHeight = Math.round((outWidth * vbHeight) / vbWidth)
  openTag = openTag
    .replace(/\s(?:width|height)="[^"]*"/g, '')
    .replace('<svg', `<svg width="${outWidth}" height="${outHeight}"`)

  // 3) Estilos que non poden depender da páxina: font + display.
  //    O `width:100%/height:100%` do render vivo (encher o panel)
  //    elimínase: nun ficheiro autocontido pisaría os atributos
  //    width/height e o tamaño deixaría de ser determinista.
  openTag = openTag.replace(/(style="[^"]*)"/, (_m, style: string) => {
    const cleaned = style.replace(/width:\s*100%;?/g, '').replace(/height:\s*100%;?/g, '')
    return `${cleaned}"`
  })
  const font = options.fontFamily ?? DEFAULT_FONT
  if (/\sstyle="/.test(openTag)) {
    openTag = openTag.replace(/\sstyle="/, ` style="font-family:${font};`)
  } else {
    openTag = openTag.replace('<svg', `<svg style="font-family:${font}"`)
  }

  // 4) Rect de fondo cubrindo o viewBox, pintado primeiro.
  const backgroundRect =
    options.background !== undefined
      ? `<rect x="${minX}" y="${minY}" width="${vbWidth}" height="${vbHeight}" fill="${options.background}"/>`
      : ''

  const rest = markup.slice((openTagMatch.index ?? 0) + openTagMatch[0].length)
  return ok(`${markup.slice(0, openTagMatch.index)}${openTag}${backgroundRect}${rest}`)
}
// ── FIN: standaloneSvg ──
