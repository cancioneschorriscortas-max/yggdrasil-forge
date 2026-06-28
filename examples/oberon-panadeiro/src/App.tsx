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
import { SkillTree, type Theme, ThemeProvider, registerIcons } from '@yggdrasil-forge/react'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ThemeLab, type ThemeLabValues, presetDarkClean } from './ThemeLab.js'
import { BAKER_ICONS, BAKER_NODE_ICONS } from './bakerIcons.js'
import { type Topology, deriveEdges } from './deriveEdges.js'
import panadeiro from './panadeiro.fixture.json'

// Iconas recoloreables do panadeiro (Opción A: cor uniforme do tema).
// Top-level: execútase unha vez ao cargar o módulo. registerIcons é
// idempotente (rexistro global singleton); React strict-mode non o
// duplica porque non está nun render nin nun efecto.
registerIcons(BAKER_ICONS)

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
  // V4 cambio 1: toggle de cor por cluster. node.color gaña sobre nodeFill<State>
  // (A.6.17), polo que activar isto perde a distinción locked/unlocked → é o
  // experimento de "pertenza por cor" (cor = grupo). Default ON para velo
  // de primeiras. Apágao para recuperar a cor por estado.
  const [colorByCluster, setColorByCluster] = useState(true)
  // V5: topoloxía conmutable (deriva edges visuais consumidor-side) +
  // voltear (xira o anel via startAngle). chain = constelación/Skyrim
  // (default para arrancar). flip respecta o "arriba" base do v4
  // (-PI/2): voltear = 180° respecto a iso = +PI/2.
  const [topology, setTopology] = useState<Topology>('chain')
  const [flip, setFlip] = useState(false)
  // V6 (constellation): selector de layout + mandos do fío radial.
  // Cando `layoutKind === 'constellation'`, o motor usa o novo
  // ConstellationLayout (@core). `memberLayout` deixa de aplicar e o
  // selector correspondente queda oculto. `compensateShortCluster`
  // só ten sentido con equal-span: sobe `node.size` dos membros do
  // cluster máis pequeno (3 nodos no panadeiro: Materia Prima) para
  // que "pesen" visualmente coma os fíos de 4. Só afecta tamaño, nunca
  // posición.
  const [layoutKind, setLayoutKind] = useState<'clustered-radial' | 'constellation'>(
    'clustered-radial',
  )
  const [innerRadius, setInnerRadius] = useState(90)
  const [outerRadius, setOuterRadius] = useState(320)
  const [lengthMode, setLengthMode] = useState<'equal-span' | 'fixed-step'>('equal-span')
  const [compensateShortCluster, setCompensateShortCluster] = useState(false)
  // Iconas SVG recoloreables (Opción A). Default ON; apágase para
  // comparar A/B contra o emoji nativo do fixture en vivo.
  const [useIcons, setUseIcons] = useState(true)
  // V6.1: selector de fondo do lenzo. Default = pozo (mantén o aspecto
  // post-v4.1). Plano/custom seguen reaccionando ao ThemeLab via
  // --ob-canvas-bg. V6.2: 'stars' retirado por invisibilidade (A.6.36);
  // substituído por 'custom' (imaxe subida pola UI; non persiste entre
  // recargas).
  const [backgroundMode, setBackgroundMode] = useState<
    'gravity-well' | 'plain' | 'custom' | 'transparent'
  >('gravity-well')
  // URL local (blob:) creada con URL.createObjectURL. Limpada con
  // URL.revokeObjectURL ao cambiar/desmontar para evitar memory leak.
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null)
  useEffect(() => {
    return () => {
      if (customImageUrl !== null) URL.revokeObjectURL(customImageUrl)
    }
  }, [customImageUrl])

  const def = useMemo(() => {
    const startAngle = flip ? Math.PI / 2 : -Math.PI / 2
    const layoutConfig =
      layoutKind === 'constellation'
        ? ({
            type: 'constellation' as const,
            shape: 'line' as const,
            innerRadius,
            outerRadius,
            lengthMode,
            startAngle,
          } as const)
        : ({
            type: 'clustered-radial' as const,
            groupRadius: 320,
            memberLayout,
            // V4 cambio 2: sen liñas. O abano + a posición xa "fan" estrela; os
            // spokes sumaban ruído sen comunicar pertenza. Recuperar con 'spokes'
            // se algunha vez se queren outra vez.
            meshType: 'none' as const,
            // V5: voltear o anel. Default do core é -PI/2 ("arriba"), o que se
            // ve en v4. Manteno como base; flip suma π (= +PI/2, "abaixo").
            startAngle,
          } as const)
    const base = importGaiaProfession(panadeiro as unknown as GaiaProfession, {
      layout: layoutConfig,
    })

    // V6: tamaño compensado dos membros do cluster máis pequeno (idea
    // de Agarfal). Só aplica con constellation + equal-span + toggle ON.
    // Atopamos o tamaño mínimo entre clusters declarados e marcamos os
    // seus membros para subilos en `node.size`.
    const shouldCompensate =
      compensateShortCluster && layoutKind === 'constellation' && lengthMode === 'equal-span'
    let smallestGroupId: string | undefined
    if (shouldCompensate) {
      const counts = new Map<string, number>()
      for (const nd of base.nodes) {
        if (nd.group !== undefined) counts.set(nd.group, (counts.get(nd.group) ?? 0) + 1)
      }
      let min = Number.POSITIVE_INFINITY
      for (const [gid, c] of counts) {
        if (c < min) {
          min = c
          smallestGroupId = gid
        }
      }
    }

    // (1) tags = [group] para que as `regions` seleccionen por tag.
    // (2) V4: cando colorByCluster está ON, asignamos node.color = cor do grupo.
    //     A.6.17: node.color gaña sobre nodeFill<State>; co toggle ON todos os
    //     nodos do mesmo cluster son da mesma cor (perdemos a distinción de
    //     estado: é o experimento de pertenza). Spread sempre para non mutar
    //     o nodo orixinal. exactOptionalPropertyTypes: engadimos `color` só
    //     cando hai valor, nunca `color: undefined`.
    // (3) root-coroa: size 52 para diferencialo visualmente do resto.
    // (4) V6: compensar nodo curto (só size).
    // (5) Capa 1A: substituír o emoji nativo (que o importador puxo en
    //     node.icon desde fixture.icono) pola icona SVG recoloreable
    //     rexistrada. Só microskills do mapa. Toggle useIcons permite A/B.
    const nodes = base.nodes.map((n) => {
      let m = n.group !== undefined ? { ...n, tags: [...(n.tags ?? []), n.group] } : { ...n }
      if (colorByCluster && n.group !== undefined && GROUP_COLORS[n.group] !== undefined) {
        m = { ...m, color: GROUP_COLORS[n.group] }
      }
      if (m.type === 'root') m = { ...m, size: 52 }
      if (smallestGroupId !== undefined && n.group === smallestGroupId && m.type !== 'root') {
        m = { ...m, size: 36 }
      }
      const slug = BAKER_NODE_ICONS[n.id]
      if (useIcons && slug !== undefined) m = { ...m, icon: slug }
      return m
    })
    // V5: arestas derivadas consumidor-side (o fixture trae conectadas:[]).
    // type:'path' → debúxanse pero NON crean gates (canUnlock intacto).
    // Lóxica en `./deriveEdges` para que a sonda a importe e probe o
    // código real, non unha copia. Concat con `base.edges` (que vén baleiro)
    // por seguridade futura.
    const derived = deriveEdges({ ...base, nodes }, topology)
    return { ...base, nodes, edges: [...base.edges, ...derived] }
  }, [
    memberLayout,
    colorByCluster,
    topology,
    flip,
    layoutKind,
    innerRadius,
    outerRadius,
    lengthMode,
    compensateShortCluster,
    useIcons,
  ])

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
        className={`ob-canvas ob-canvas--bg-${backgroundMode}`}
        // V3 cambio B: fondo do lenzo vivo. `buildThemeFromVals` segue OMITINDO
        // `colors.background` (pauta F11.3d intacta). En vez de pintar inline no
        // <svg>, expoñemos `themeVals.canvas` como CSS variable e styles.css
        // úsaa como background do contedor.
        style={{
          ['--ob-canvas-bg' as string]: themeVals.canvas,
          ...(backgroundMode === 'custom' && customImageUrl !== null
            ? { ['--ob-canvas-image' as string]: `url(${customImageUrl})` }
            : {}),
        }}
      >
        <div className="ob-toolbar">
          <label>
            Layout:{' '}
            <select
              value={layoutKind}
              onChange={(e) =>
                setLayoutKind(e.target.value as 'clustered-radial' | 'constellation')
              }
            >
              <option value="clustered-radial">clustered-radial</option>
              <option value="constellation">constellation</option>
            </select>
          </label>
          {layoutKind === 'clustered-radial' && (
            <label style={{ marginLeft: 12 }}>
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
          )}
          {layoutKind === 'constellation' && (
            <>
              <label style={{ marginLeft: 12 }}>
                inner:{' '}
                <input
                  type="range"
                  min={40}
                  max={200}
                  step={5}
                  value={innerRadius}
                  onChange={(e) => setInnerRadius(Number(e.target.value))}
                />{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{innerRadius}</span>
              </label>
              <label style={{ marginLeft: 12 }}>
                outer:{' '}
                <input
                  type="range"
                  min={200}
                  max={420}
                  step={5}
                  value={outerRadius}
                  onChange={(e) => setOuterRadius(Number(e.target.value))}
                />{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{outerRadius}</span>
              </label>
              <label style={{ marginLeft: 12 }}>
                lengthMode:{' '}
                <select
                  value={lengthMode}
                  onChange={(e) => setLengthMode(e.target.value as 'equal-span' | 'fixed-step')}
                >
                  <option value="equal-span">equal-span</option>
                  <option value="fixed-step">fixed-step</option>
                </select>
              </label>
              <label style={{ marginLeft: 12 }}>
                <input
                  type="checkbox"
                  checked={compensateShortCluster}
                  onChange={(e) => setCompensateShortCluster(e.target.checked)}
                  disabled={lengthMode !== 'equal-span'}
                />{' '}
                compensar nodo curto
              </label>
            </>
          )}
          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={colorByCluster}
              onChange={(e) => setColorByCluster(e.target.checked)}
            />{' '}
            cor por cluster
          </label>
          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={useIcons}
              onChange={(e) => setUseIcons(e.target.checked)}
            />{' '}
            iconas
          </label>
          <label style={{ marginLeft: 12 }}>
            topoloxía:{' '}
            <select value={topology} onChange={(e) => setTopology(e.target.value as Topology)}>
              <option value="none">ningunha</option>
              <option value="star">estrela</option>
              <option value="hub">hub</option>
              <option value="chain">fío</option>
            </select>
          </label>
          <label style={{ marginLeft: 12 }}>
            <input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />{' '}
            voltear
          </label>
          <label style={{ marginLeft: 12 }}>
            fondo:{' '}
            <select
              value={backgroundMode}
              onChange={(e) =>
                setBackgroundMode(
                  e.target.value as 'gravity-well' | 'plain' | 'custom' | 'transparent',
                )
              }
            >
              <option value="gravity-well">pozo</option>
              <option value="plain">plano</option>
              <option value="custom">personalizada</option>
              <option value="transparent">sen</option>
            </select>
          </label>
          {backgroundMode === 'custom' && (
            <label style={{ marginLeft: 8 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file === undefined) return
                  // setCustomImageUrl(newUrl) → useEffect cleanup revoga
                  // a URL anterior antes de aplicar a nova. Cero leak.
                  setCustomImageUrl(URL.createObjectURL(file))
                }}
                style={{ fontSize: 11, maxWidth: 160 }}
              />
            </label>
          )}
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
