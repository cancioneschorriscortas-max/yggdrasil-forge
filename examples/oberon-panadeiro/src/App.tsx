// ── INICIO: App `oberon-panadeiro` v2 ──
//
// Spike con capas visuais:
//   - regions (etiqueta + cor por cluster); tags derivados do group
//   - curve "radial" (prop de SkillTree; non vai en LayoutConfig)
//   - root-coroa size=52
//   - maxLabelChars=14 (truncado + tooltip)
//   - ThemeLab embebido para afinar paleta dark en vivo
//
// Todo é consumidor-side; cero cambios en @core/@react/@importers.

import { TreeEngine } from '@yggdrasil-forge/core'
import { type GaiaProfession, importGaiaProfession } from '@yggdrasil-forge/importers'
import { SkillTree, type Theme, ThemeProvider } from '@yggdrasil-forge/react'
import type { JSX } from 'react'
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
import panadeiro from './panadeiro.fixture.json'

// Cor de partida por cluster. Agarfal afínaa en vivo no ThemeLab
// (capa 2: selector de rexión + cor da rexión).
const GROUP_COLORS: Record<string, string> = {
  panadeiro_forno_masas: '#d98a2b',
  panadeiro_tempos_fermentacion: '#8b6fc4',
  panadeiro_sabor_creatividade: '#c4577f',
  panadeiro_resistencia_oficio: '#5e9a5b',
  panadeiro_materia_prima: '#3f9a9a',
}

/** Resolve `LocalizedString | string` a string preferindo gl > es > en. */
function loc(l: unknown): string {
  if (typeof l === 'string') return l
  if (l !== null && typeof l === 'object') {
    const m = l as Record<string, string>
    return m.gl ?? m.es ?? m.en ?? Object.values(m)[0] ?? ''
  }
  return ''
}

/**
 * Mapeo `ThemeLabValues → Theme`. Copia exacta do builtTheme do
 * `examples/react-demo/src/App.tsx`, con `maxLabelChars: 14` engadido en
 * `sizes` (a feature opt-in para truncar etiquetas longas + tooltip nativo).
 * Mantense o mesmo padrón: `background` OMITIDO (non `undefined`) para
 * non pintar inline no <svg> (a regra de exactOptionalPropertyTypes
 * + a F11.3d).
 */
function buildThemeFromVals(themeVals: ThemeLabValues): Theme {
  return {
    colors: {
      text: themeVals.text,
      nodeLocked: themeVals.nodeLocked,
      nodeUnlockable: themeVals.nodeUnlockable,
      nodeUnlocked: themeVals.nodeUnlocked,
      nodeMaxed: themeVals.nodeMaxed,
      nodeInProgress: themeVals.nodeInProgress,
      nodeStroke: themeVals.nodeLocked,
      edge: themeVals.edge,
      // V3 cambio 4: spokes visibles. O default copiado do react-demo era
      // `rgba(148, 163, 184, 0.08)` (8% sobre fondo escuro = case invisible).
      // Ligamos o mesh á cor de Edges → o input "Edges" do ThemeLab controla
      // tamén a opacidade efectiva dos spokes do clustered-radial.
      mesh: themeVals.edge,
      nodeFill: themeVals.fill,
      nodeFillLocked: themeVals.nodeFillLocked,
      nodeFillUnlockable: themeVals.nodeFillUnlockable,
      nodeFillUnlocked: themeVals.nodeFillUnlocked,
      nodeFillMaxed: themeVals.nodeFillMaxed,
      nodeFillInProgress: themeVals.nodeFillInProgress,
    },
    sizes: {
      strokeWidth: 2.5,
      fontSize: 14,
      fontSizeSmall: 11,
      ringWidth: themeVals.ringWidth,
      maxLabelChars: 14,
    },
    typography: {
      fontFamily: '"Cinzel", serif',
      fontWeight: 600,
      letterSpacing: '0.04em',
    },
  }
}

export function App(): JSX.Element {
  // V3 cambio C: toggle en vivo de memberLayout. Reconstrúese a def
  // (e o engine) ao mudar. Os 3 (fan/list/cluster) están implementados
  // en ClusteredRadialLayout. Reinicianse desbloqueos (esperable: o
  // exemplo compara FORMAS, non garda progreso).
  const [memberLayout, setMemberLayout] = useState<'fan' | 'list' | 'cluster'>('fan')

  const def = useMemo(() => {
    const base = importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: {
        type: 'clustered-radial',
        groupRadius: 320,
        memberLayout,
        meshType: 'spokes',
      },
    })
    // (1) tags = [group] para que as `regions` seleccionen por tag.
    // (2) root-coroa: size 52 para diferencialo visualmente do resto.
    const nodes = base.nodes.map((n) => {
      const tagged = n.group !== undefined ? { ...n, tags: [...(n.tags ?? []), n.group] } : n
      return tagged.type === 'root' ? { ...tagged, size: 52 } : tagged
    })
    return { ...base, nodes }
  }, [memberLayout])

  const engine = useMemo(() => new TreeEngine(def), [def])

  useSyncExternalStore(
    useCallback((cb: () => void) => engine.subscribe(cb), [engine]),
    () => engine.getSnapshot(),
    () => engine.getServerSnapshot(),
  )

  // O ThemeLab do react-demo ten `regionColors` como prop SEPARADA
  // (non dentro de ThemeLabValues). Polo tanto mantemos dous estados:
  // o tema xeral e as cores por rexión.
  const [themeVals, setThemeVals] = useState<ThemeLabValues>(presetDarkClean)
  const [regionColors, setRegionColors] = useState<Record<string, string>>(GROUP_COLORS)
  const [activeRegion, setActiveRegion] = useState<string | undefined>(undefined)

  const builtTheme: Theme = useMemo(() => buildThemeFromVals(themeVals), [themeVals])

  const regions = useMemo(
    () =>
      (def.groups ?? []).map((g) => ({
        id: g.id,
        label: loc(g.label),
        tag: g.id,
        color: regionColors[g.id] ?? GROUP_COLORS[g.id] ?? '#999999',
      })),
    [def, regionColors],
  )

  const onNodeClick = useCallback(
    (id: string) => {
      // V3 cambio A: o motor SI sobe tiers cando `state === 'unlocked'` se
      // `maxTier > 1`; o guard previo (`unlocked || maxed`) bloqueaba o
      // segundo `unlock` e quedaba en tier 1. Agora só evitamos chamar
      // cando xa estamos en `maxed` (cap absoluto). A guard A.6.33 contra
      // o estado inicial `locked` segue cuberta (todo o que non é `maxed`
      // chama unlock; o motor decide internamente con canUnlock).
      const st = engine.getNodeState(id)?.state ?? 'locked'
      if (st !== 'maxed') void engine.unlock(id)
    },
    [engine],
  )

  const onRegionColorChange = useCallback((id: string, color: string) => {
    setRegionColors((prev) => ({ ...prev, [id]: color }))
  }, [])

  return (
    <div className="ob-shell">
      <div
        className="ob-canvas"
        // V3 cambio B: fondo do lenzo vivo. `buildThemeFromVals` segue OMITINDO
        // `colors.background` (pauta F11.3d intacta). En vez de pintar inline no
        // <svg>, expoñemos `themeVals.canvas` como CSS variable e styles.css
        // úsaa como background do contedor.
        style={{ ['--ob-canvas-bg' as string]: themeVals.canvas }}
      >
        <div className="ob-toolbar">
          <label>
            Forma intra-cluster:{' '}
            <select
              value={memberLayout}
              onChange={(e) => setMemberLayout(e.target.value as 'fan' | 'list' | 'cluster')}
            >
              <option value="fan">fan</option>
              <option value="list">list</option>
              <option value="cluster">cluster</option>
            </select>
          </label>
        </div>
        <ThemeProvider theme={builtTheme}>
          <SkillTree
            engine={engine}
            onNodeClick={onNodeClick}
            regions={regions}
            curve="radial"
            locale="gl"
          />
        </ThemeProvider>
      </div>
      <aside className="ob-themelab theme-lab">
        <ThemeLab
          value={themeVals}
          onChange={setThemeVals}
          regions={regions.map((r) => ({ id: r.id, label: r.label }))}
          regionColors={regionColors}
          {...(activeRegion !== undefined ? { activeRegion } : {})}
          onActiveRegionChange={setActiveRegion}
          onRegionColorChange={onRegionColorChange}
        />
      </aside>
    </div>
  )
}
// ── FIN: App `oberon-panadeiro` v2 ──
