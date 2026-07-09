// ── INICIO: tests SkillNode icon resolution (F10.5) ──
import { render } from '@testing-library/react'
import type { NodeDef, NodeInstance, NodeState } from '@yggdrasil-forge/core'
import { describe, expect, it } from 'vitest'
import { SkillNode } from '../src/SkillNode.js'
import { ThemeProvider } from '../src/ThemeProvider.js'
import { registerIcon } from '../src/icons/registry.js'
import { minimal } from '../src/themes/minimal.js'

// Setup: rexistrar 1 icona para os tests (idempotente)
registerIcon('test-svg-icon', {
  paths: [{ d: 'M12 2 L22 22 L2 22 Z', mode: 'fill' }],
})

function makeNode(icon: string | undefined): NodeDef {
  const base: NodeDef = {
    id: 'n1',
    type: 'small',
    label: { en: 'X', es: 'X', gl: 'X' },
  }
  return icon !== undefined ? { ...base, icon } : base
}

function renderNode(node: NodeDef) {
  return render(
    <ThemeProvider theme={minimal}>
      <svg role="img" aria-label="t">
        <SkillNode node={node} instance={undefined} position={{ x: 0, y: 0 }} />
      </svg>
    </ThemeProvider>,
  )
}

/** F11.3c: render con state explícito (vía instance). */
function renderNodeWithState(node: NodeDef, state: NodeState) {
  const instance: NodeInstance = { id: node.id, state, currentTier: 0 }
  return render(
    <ThemeProvider theme={minimal}>
      <svg role="img" aria-label="t">
        <SkillNode node={node} instance={instance} position={{ x: 0, y: 0 }} />
      </svg>
    </ThemeProvider>,
  )
}

describe('SkillNode icon — resolución (F10.5)', () => {
  it('id rexistrado → renderiza IconGlyph (<svg> aniñado)', () => {
    const { container } = renderNode(makeNode('test-svg-icon'))
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    expect(iconSvg?.tagName.toLowerCase()).toBe('svg')
    // path con fill="currentColor" → confirma IconGlyph
    expect(iconSvg?.querySelector('path')?.getAttribute('fill')).toBe('currentColor')
    // NON debe haber un <text> de icono nin <image>
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })

  it('URL absoluta → renderiza <image>', () => {
    const { container } = renderNode(makeNode('https://example.com/icon.png'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('href')).toBe('https://example.com/icon.png')
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
  })

  it('URL relativa (//cdn...) → renderiza <image>', () => {
    const { container } = renderNode(makeNode('//cdn.example.com/icon.svg'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe('//cdn.example.com/icon.svg')
  })

  it('emoji/char (non rexistrado, non URL) → renderiza <text> (fallback)', () => {
    const { container } = renderNode(makeNode('🔥'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('🔥')
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })

  it('node sen icon → cero elementos de icono', () => {
    const { container } = renderNode(makeNode(undefined))
    expect(container.querySelector('svg.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
  })

  it('id non rexistrado pero non URL → renderiza <text> (fallback)', () => {
    const { container } = renderNode(makeNode('not-registered-id-12345'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('not-registered-id-12345')
  })

  // ── F11.3: rutas locais + data: + extensións de imaxe ──

  it('ruta absoluta local (/badges/x.webp) → renderiza <image>', () => {
    const { container } = renderNode(makeNode('/badges/sword-basics.webp'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('href')).toBe('/badges/sword-basics.webp')
    expect(container.querySelector('text.yf-skill-node__icon')).toBeNull()
  })

  it('ruta relativa "./a.png" → renderiza <image>', () => {
    const { container } = renderNode(makeNode('./a.png'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe('./a.png')
  })

  it('ruta relativa "../b.avif" → renderiza <image>', () => {
    const { container } = renderNode(makeNode('../b.avif'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe('../b.avif')
  })

  it('data: URL → renderiza <image>', () => {
    const dataUri = 'data:image/webp;base64,AAAA'
    const { container } = renderNode(makeNode(dataUri))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe(dataUri)
  })

  it('extensión .webp con esquema https → renderiza <image>', () => {
    const { container } = renderNode(makeNode('https://x/a.webp'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('href')).toBe('https://x/a.webp')
  })

  it('emoji ⚔️ (non é imaxe nin glyph) → renderiza <text>, NON <image>', () => {
    const { container } = renderNode(makeNode('⚔️'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('⚔️')
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })

  it('cadea sen ruta nin extensión ("foo") → renderiza <text>, non <image>', () => {
    const { container } = renderNode(makeNode('foo'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text?.textContent).toBe('foo')
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })
})

describe('SkillNode icon — recolor (F10.5)', () => {
  it('aplica color do tema (ThemeColors.text por default)', () => {
    const { container } = renderNode(makeNode('test-svg-icon'))
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    const styleAttr = iconSvg?.getAttribute('style') ?? ''
    // minimal.colors.text = '#222222' → jsdom normaliza a rgb(34, 34, 34)
    expect(styleAttr).toMatch(/color:\s*(?:#222222|rgb\(34,\s*34,\s*34\))/)
  })
})

// ── F11.3b: imageSize ≠ iconSize ──

describe('SkillNode icon — tamaño separado para badges raster (F11.3b)', () => {
  // makeNode usa `type: 'small'` → radius = 16 (DEFAULT_RADIUS_BY_TYPE.small)
  // → iconSize = radius * 1.0 = 16; imageSize = radius * 1.8 = 28.8
  const RADIUS = 16
  const EXPECTED_IMAGE_SIZE = RADIUS * 1.8
  const EXPECTED_ICON_SIZE = RADIUS * 1.0

  it('<image> renderiza a imageSize = radius * 1.8', () => {
    const { container } = renderNode(makeNode('/badges/sword-basics.webp'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE, 6)
    expect(Number(img?.getAttribute('height'))).toBeCloseTo(EXPECTED_IMAGE_SIZE, 6)
    // Centrado: x e y == -imageSize/2
    expect(Number(img?.getAttribute('x'))).toBeCloseTo(-EXPECTED_IMAGE_SIZE / 2, 6)
    expect(Number(img?.getAttribute('y'))).toBeCloseTo(-EXPECTED_IMAGE_SIZE / 2, 6)
  })

  it('★ <image> declara preserveAspectRatio="xMidYMid slice" (cobre e recorta á forma do nodo)', () => {
    const { container } = renderNode(makeNode('/badges/sword-basics.webp'))
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice')
  })

  it('★ <image> ten clip-path referenciando un <clipPath> propio do nodo', () => {
    const { container } = renderNode(makeNode('/badges/sword-basics.webp'))
    const img = container.querySelector('image.yf-skill-node__icon')
    const clipAttr = img?.getAttribute('clip-path')
    expect(clipAttr).toMatch(/^url\(#yf-icon-clip-/)
    const clipId = clipAttr?.match(/url\(#([^)]+)\)/)?.[1]
    expect(clipId).toBeDefined()
    const clipPathEl = container.querySelector(`clipPath#${clipId}`)
    expect(clipPathEl).not.toBeNull()
  })

  describe('★ iconScale — zoom manual da imaxe dentro da forma', () => {
    function makeNodeWithScale(icon: string, iconScale: number | undefined): NodeDef {
      return { ...makeNode(icon), ...(iconScale !== undefined && { iconScale }) } as NodeDef
    }

    it('sen iconScale (undefined): tamaño base, igual que antes (cero regresión)', () => {
      const { container } = renderNode(makeNodeWithScale('/badges/x.webp', undefined))
      const img = container.querySelector('image.yf-skill-node__icon')
      expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE, 6)
    })

    it('iconScale=1 explícito: mesmo tamaño base', () => {
      const { container } = renderNode(makeNodeWithScale('/badges/x.webp', 1))
      const img = container.querySelector('image.yf-skill-node__icon')
      expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE, 6)
    })

    it('★ iconScale=2: dobra o tamaño base (máis zoom = máis recorte)', () => {
      const { container } = renderNode(makeNodeWithScale('/badges/x.webp', 2))
      const img = container.querySelector('image.yf-skill-node__icon')
      expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE * 2, 6)
      expect(Number(img?.getAttribute('x'))).toBeCloseTo((-EXPECTED_IMAGE_SIZE * 2) / 2, 6)
    })

    it('★ iconScale > 3 clamea a 3 (defensivo, aínda que o schema xa o impide)', () => {
      const { container } = renderNode(makeNodeWithScale('/badges/x.webp', 10))
      const img = container.querySelector('image.yf-skill-node__icon')
      expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE * 3, 6)
    })

    it('★ iconScale < 1 clamea a 1 (defensivo)', () => {
      const { container } = renderNode(makeNodeWithScale('/badges/x.webp', 0.2))
      const img = container.querySelector('image.yf-skill-node__icon')
      expect(Number(img?.getAttribute('width'))).toBeCloseTo(EXPECTED_IMAGE_SIZE, 6)
    })

    it('iconScale non afecta a glyphs vector rexistrados (IconGlyph ignora o campo)', () => {
      const node = { ...makeNode('test-svg-icon'), iconScale: 2 } as NodeDef
      const { container } = renderNode(node)
      const svg = container.querySelector('svg[width]')
      expect(Number(svg?.getAttribute('width'))).toBeCloseTo(EXPECTED_ICON_SIZE, 6)
    })

    it('iconScale non afecta ao fallback <text> (emoji)', () => {
      const node = { ...makeNode('⚔️'), iconScale: 2 } as NodeDef
      const { container } = renderNode(node)
      expect(container.querySelector('text.yf-skill-node__icon')).not.toBeNull()
      expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
    })
  })

  it('IconGlyph (glyph vector) mantén tamaño iconSize = radius * 1.0 (regresión)', () => {
    const { container } = renderNode(makeNode('test-svg-icon'))
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    expect(iconSvg).not.toBeNull()
    // IconGlyph renderiza un <svg> con width/height == size.
    expect(Number(iconSvg?.getAttribute('width'))).toBeCloseTo(EXPECTED_ICON_SIZE, 6)
    expect(Number(iconSvg?.getAttribute('height'))).toBeCloseTo(EXPECTED_ICON_SIZE, 6)
    // Confirmamos que IMAGE_SIZE > ICON_SIZE para garantir que NON pasou
    // a usar o tamaño da imaxe (regresión cero).
    expect(EXPECTED_IMAGE_SIZE).toBeGreaterThan(EXPECTED_ICON_SIZE)
  })

  it('emoji (fallback <text>) sen cambios de tamaño (intacto)', () => {
    const { container } = renderNode(makeNode('⚔️'))
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text).not.toBeNull()
    // Non comprobamos size exacto do text (depende do fontSize do CSS);
    // só que segue caendo á rama text e non a <image>.
    expect(container.querySelector('image.yf-skill-node__icon')).toBeNull()
  })
})

// ── F11.3c: atenuación do badge en estado locked ──

describe('SkillNode icon — locked dim (F11.3c)', () => {
  it("nodo 'locked' con badge raster → <image> ten filter de atenuación", () => {
    const { container } = renderNodeWithState(makeNode('/badges/sword-basics.webp'), 'locked')
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    const styleAttr = img?.getAttribute('style') ?? ''
    expect(styleAttr).toMatch(/grayscale\(1\)/)
    expect(styleAttr).toMatch(/brightness\(0\.5\)/)
  })

  it("nodo 'unlockable' con badge → SEN filter (badge vívido)", () => {
    const { container } = renderNodeWithState(makeNode('/badges/sword-basics.webp'), 'unlockable')
    const img = container.querySelector('image.yf-skill-node__icon')
    expect(img).not.toBeNull()
    const styleAttr = img?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })

  it("nodo 'unlocked' con badge → SEN filter", () => {
    const { container } = renderNodeWithState(makeNode('/badges/sword-basics.webp'), 'unlocked')
    const img = container.querySelector('image.yf-skill-node__icon')
    const styleAttr = img?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })

  it("nodo 'maxed' con badge → SEN filter", () => {
    const { container } = renderNodeWithState(makeNode('/badges/sword-basics.webp'), 'maxed')
    const img = container.querySelector('image.yf-skill-node__icon')
    const styleAttr = img?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })

  it("nodo 'in_progress' con badge → SEN filter", () => {
    const { container } = renderNodeWithState(makeNode('/badges/sword-basics.webp'), 'in_progress')
    const img = container.querySelector('image.yf-skill-node__icon')
    const styleAttr = img?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })

  it("glyph en nodo 'locked' → IconGlyph sen filter (regresión)", () => {
    const { container } = renderNodeWithState(makeNode('test-svg-icon'), 'locked')
    const iconSvg = container.querySelector('svg.yf-skill-node__icon')
    expect(iconSvg).not.toBeNull()
    // O glyph nunca debe levar o filter de grayscale (só afecta a <image>).
    const styleAttr = iconSvg?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })

  it("emoji en nodo 'locked' → <text> sen filter (regresión)", () => {
    const { container } = renderNodeWithState(makeNode('⚔️'), 'locked')
    const text = container.querySelector('text.yf-skill-node__icon')
    expect(text).not.toBeNull()
    const styleAttr = text?.getAttribute('style') ?? ''
    expect(styleAttr).not.toMatch(/grayscale/)
  })
})
// ── FIN: tests SkillNode icon ──
