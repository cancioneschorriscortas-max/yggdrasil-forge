// ── INICIO: treeDefSchema (Zod) ──
// Esquema Zod que refleja la estructura del tipo TreeDef (types/tree.ts).
// SOLO validación estructural: no incluye reglas pedagógicas (Fase 8.7).
//
// Diseño (decisión 5.2 del briefing):
// - El esquema raíz se tipa como z.ZodType<TreeDef> usando el TIPO del
//   contrato directamente (no un shape duplicado). Así z.infer<typeof
//   treeDefSchema> es exactamente TreeDef: asignable por construcción,
//   sin duplicar el contrato y sin `any`.
// - Las estructuras recursivas (RichContent.composite, Effect.conditional/
//   composite, TreeDef.subtrees) usan el patrón canónico de Zod 3 con
//   z.lazy, tipadas con sus tipos de contrato respectivos.

// La garantía de asignabilidad esquema↔TreeDef se verifica en el test de
// tipo de T7 con el helper tolerante a exactOptionalPropertyTypes (decisión
// del arquitecto, Opción 2). Las anotaciones z.ZodType<...> de subesquemas
// y raíz se omiten porque Zod 3 + exactOptionalPropertyTypes hacen imposible
// satisfacerlas sin `as`/`any` (issues Zod #635/#3186/#3293).
import { z } from 'zod'

// ── LocalizedString: string | Record<string, string> ──
// Refleja @yggdrasil-forge/common: type LocalizedString = string | Record<string, string>
const localizedStringSchema = z.union([z.string(), z.record(z.string(), z.string())])

// ── Position: { x: number; y: number } ──
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

// ── Resource (types/resources.ts) ──
const resourceSchema = z.object({
  id: z.string(),
  label: localizedStringSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  initial: z.number().optional(),
  max: z.number().optional(),
  refundable: z.boolean().optional(),
  refundPercent: z.number().optional(),
})

// ── Cost (types/resources.ts) ──
const costSchema = z.object({
  resourceId: z.string(),
  amount: z.number(),
})

// ── Budget (types/resources.ts) ──
const budgetSchema = z.object({
  resources: z.record(z.string(), z.number()),
})

// ── NodeState (types/node.ts) ──
const nodeStateSchema = z.union([
  z.literal('locked'),
  z.literal('unlockable'),
  z.literal('in_progress'),
  z.literal('unlocked'),
  z.literal('maxed'),
  z.literal('disabled'),
  z.literal('expired'),
])

// ── StatContributionOp (types/stats.ts) ──
const statContributionOpSchema = z.union([
  z.literal('+'),
  z.literal('-'),
  z.literal('*'),
  z.literal('/'),
  z.literal('min'),
  z.literal('max'),
  z.literal('set'),
])

// ── UnlockCondition (types/unlock.ts): unión discriminada por `type` ──
const unlockConditionSchema = z.union([
  z.object({ type: z.literal('node_unlocked'), nodeId: z.string() }),
  z.object({ type: z.literal('node_maxed'), nodeId: z.string() }),
  z.object({ type: z.literal('node_state'), nodeId: z.string(), state: nodeStateSchema }),
  z.object({ type: z.literal('nodes_count'), count: z.number(), scope: z.string().optional() }),
  z.object({ type: z.literal('resource_min'), resourceId: z.string(), amount: z.number() }),
  z.object({ type: z.literal('tier_min'), nodeId: z.string(), tier: z.number() }),
  z.object({ type: z.literal('distance_max'), fromNodeId: z.string(), maxSteps: z.number() }),
  z.object({ type: z.literal('tag_count'), tag: z.string(), count: z.number() }),
  z.object({ type: z.literal('progress_min'), nodeId: z.string(), percent: z.number() }),
  z.object({ type: z.literal('subtree_completion'), subtreeId: z.string(), percent: z.number() }),
  z.object({ type: z.literal('stat_min'), statId: z.string(), amount: z.number() }),
  z.object({ type: z.literal('time_after'), timestamp: z.number() }),
  z.object({ type: z.literal('time_before'), timestamp: z.number() }),
  z.object({ type: z.literal('custom'), evaluator: z.string() }),
])

// ── StatContribution (types/stats.ts) ──
const statContributionSchema = z.object({
  statId: z.string(),
  op: statContributionOpSchema,
  value: z.number(),
  perTier: z.boolean().optional(),
  conditions: z.array(unlockConditionSchema).optional(),
})

// ── UnlockRule (types/unlock.ts): combinaciones lógicas + condición simple ──
const unlockRuleSchema = z.union([
  z.object({ type: z.literal('all'), conditions: z.array(unlockConditionSchema) }),
  z.object({ type: z.literal('any'), conditions: z.array(unlockConditionSchema) }),
  z.object({ type: z.literal('none'), conditions: z.array(unlockConditionSchema) }),
  unlockConditionSchema,
])

// ── RichContent (types/content.ts): recursiva por la variante `composite` ──
// z.lazy resuelve la auto-referencia composite.items: RichContent[].
const richContentSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('text'), value: localizedStringSchema }),
    z.object({ type: z.literal('markdown'), value: localizedStringSchema }),
    z.object({
      type: z.literal('html'),
      value: localizedStringSchema,
      sanitized: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('image'),
      src: z.string(),
      alt: localizedStringSchema.optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
    z.object({
      type: z.literal('video'),
      src: z.string(),
      poster: z.string().optional(),
      provider: z.union([z.literal('youtube'), z.literal('vimeo'), z.literal('mp4')]).optional(),
    }),
    z.object({ type: z.literal('audio'), src: z.string() }),
    z.object({
      type: z.literal('link'),
      href: z.string(),
      label: localizedStringSchema,
      external: z.boolean().optional(),
    }),
    z.object({ type: z.literal('composite'), items: z.array(richContentSchema) }),
    z.object({
      type: z.literal('custom'),
      componentId: z.string(),
      props: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
)

// ── NodeContent (types/content.ts) ──
const nodeContentSchema = z.object({
  tooltip: richContentSchema.optional(),
  detail: richContentSchema.optional(),
  preview: richContentSchema.optional(),
  unlocked: richContentSchema.optional(),
  flavor: localizedStringSchema.optional(),
})

// ── Effect (types/effects.ts): recursiva (conditional, composite) ──
const effectOpSchema = z.union([z.literal('+'), z.literal('-'), z.literal('*')])

const effectSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('modify_resource'),
      resourceId: z.string(),
      op: effectOpSchema,
      amount: z.number(),
    }),
    z.object({
      type: z.literal('modify_stat'),
      statId: z.string(),
      op: effectOpSchema,
      amount: z.number(),
    }),
    z.object({
      type: z.literal('modify_node_state'),
      nodeId: z.string(),
      state: nodeStateSchema,
    }),
    z.object({
      type: z.literal('set_node_visibility'),
      nodeId: z.string(),
      visible: z.boolean(),
    }),
    z.object({ type: z.literal('unlock_node'), nodeId: z.string() }),
    z.object({ type: z.literal('set_progress'), nodeId: z.string(), percent: z.number() }),
    z.object({
      type: z.literal('trigger_event'),
      eventName: z.string(),
      payload: z.unknown().optional(),
      irreversible: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('conditional'),
      condition: unlockConditionSchema,
      // biome-ignore lint/suspicious/noThenProperty: `then` es el campo del contrato Effect (variante 'conditional', types/effects.ts); no es una thenable y no se puede renombrar sin tocar el contrato.
      then: z.array(effectSchema),
      else: z.array(effectSchema).optional(),
    }),
    z.object({ type: z.literal('composite'), effects: z.array(effectSchema) }),
    z.object({
      type: z.literal('plugin'),
      pluginId: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
)

// ── AuthConfig (types/auth.ts) — referenciado por ProgressSourceConfig.remote ──
// El contrato exacto de AuthConfig vive en auth.ts y aquí solo aparece como
// campo opcional de remote. Se modela como record para respetar la forma
// estructural sin inventar campos que este contrato no fija.
const authConfigSchema = z.record(z.string(), z.unknown())

// ── ProgressSourceConfig (types/progress.ts) ──
const progressSourceConfigSchema = z.union([
  z.object({ type: z.literal('manual') }),
  z.object({
    type: z.literal('remote'),
    endpoint: z.string(),
    intervalMs: z.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    auth: authConfigSchema.optional(),
  }),
  z.object({
    type: z.literal('callback'),
    handlerId: z.string(),
    intervalMs: z.number().optional(),
  }),
  z.object({ type: z.literal('event'), eventName: z.string() }),
  z.object({
    type: z.literal('computed'),
    dependsOn: z.array(z.string()),
    formula: z.union([z.literal('sum'), z.literal('avg'), z.literal('min'), z.literal('max')]),
  }),
])

// ── TimeConstraints (types/time.ts) ──
const timeConstraintsSchema = z.object({
  startsAt: z.number().optional(),
  expiresAt: z.number().optional(),
  expiresAtCalendar: z
    .object({
      date: z.string(),
      time: z.string(),
      timezone: z.string(),
    })
    .optional(),
  validForMs: z.number().optional(),
  cooldownMs: z.number().optional(),
  reCertifyAfterMs: z.number().optional(),
})

// ── NodeType (types/node.ts) ──
const nodeTypeSchema = z.union([
  z.literal('small'),
  z.literal('notable'),
  z.literal('keystone'),
  z.literal('mastery'),
  z.literal('ascendancy'),
  z.literal('root'),
  z.literal('cluster'),
  z.literal('gateway'),
  z.literal('milestone'),
  z.literal('subtree_anchor'),
  z.literal('custom'),
])

// ── EdgeType + EdgeStyle + EdgeDef (types/edge.ts) ──
const edgeTypeSchema = z.union([
  z.literal('dependency'),
  z.literal('soft_dependency'),
  z.literal('exclusion'),
  z.literal('enhancement'),
  z.literal('path'),
  z.literal('cluster'),
  z.literal('subtree_link'),
])

const edgeStyleSchema = z.object({
  color: z.string().optional(),
  width: z.number().optional(),
  dashPattern: z.array(z.number()).optional(),
  glow: z.boolean().optional(),
  animated: z.boolean().optional(),
})

const edgeDefSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: edgeTypeSchema,
  bidirectional: z.boolean().optional(),
  label: localizedStringSchema.optional(),
  weight: z.number().optional(),
  style: edgeStyleSchema.optional(),
})

// ── NodeDef (types/node.ts) ──
const nodeDefSchema = z.object({
  id: z.string(),
  type: nodeTypeSchema,
  label: localizedStringSchema,
  description: localizedStringSchema.optional(),
  content: nodeContentSchema.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tier: z.number().optional(),
  maxTier: z.number().optional(),
  cost: z.array(costSchema).optional(),
  costPerTier: z.array(z.array(costSchema)).optional(),
  effects: z.array(effectSchema).optional(),
  prerequisites: unlockRuleSchema.optional(),
  exclusions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  position: positionSchema.optional(),
  group: z.string().optional(),
  supportsProgress: z.boolean().optional(),
  progressMilestones: z.array(z.number()).optional(),
  progressSource: progressSourceConfigSchema.optional(),
  subtreeId: z.string().optional(),
  timeConstraints: timeConstraintsSchema.optional(),
  statContributions: z.array(statContributionSchema).optional(),
})

// ── GroupDef (types/tree.ts) ──
const groupDefSchema = z.object({
  id: z.string(),
  label: localizedStringSchema,
  color: z.string().optional(),
  icon: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  position: positionSchema.optional(),
})

// ── StatDef (types/tree.ts) ──
const statDefSchema = z.object({
  id: z.string(),
  label: localizedStringSchema,
  initial: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  format: z.union([z.literal('number'), z.literal('percent'), z.literal('currency')]).optional(),
})

// ── LayoutConfig (types/tree.ts): { type: string } + índice abierto ──
// El contrato declara `readonly [key: string]: unknown`: catchall conserva
// campos extra sin perder la clave `type` requerida.
const layoutConfigSchema = z.object({ type: z.string() }).catchall(z.unknown())

// ── I18nConfig (types/i18n.ts) ──
// Locale = string. `resolver` es una función opcional que no aparece en datos
// serializados pero el contrato la permite en memoria. z.function respeta la
// forma estructural sin invalidar TreeDef cargados en runtime.
const i18nConfigSchema = z.object({
  defaultLocale: z.string(),
  fallbackLocale: z.string(),
  resolver: z.function().args(z.string(), z.string()).returns(z.string()).optional(),
})

/**
 * Forma estructural del esquema raíz, SIN la envoltura z.lazy.
 *
 * Zod infiere este esquema con su tipo estructural real (z.infer funciona
 * aquí). Es la pieza que el test de tipo de T7 compara de forma cirúrgica
 * contra TreeDef mediante el helper tolerante a exactOptionalPropertyTypes.
 *
 * La recursión `subtrees` referencia el wrapper lazy `treeDefSchema`, por lo
 * que el comportamiento en runtime (validación de sub-árboles anidadas) es
 * idéntico al del esquema público. Se exporta para uso del validador
 * (TreeDefValidator parsea con este esquema; z.infer da el tipo estructural
 * sin `as`/`any`) y del test de tipo de T7.
 */
export const treeDefShapeSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  version: z.string(),
  label: localizedStringSchema,
  description: localizedStringSchema.optional(),
  author: z.string().optional(),
  rootNodeId: z.string().optional(),
  nodes: z.array(nodeDefSchema),
  edges: z.array(edgeDefSchema),
  groups: z.array(groupDefSchema).optional(),
  resources: z.array(resourceSchema).optional(),
  stats: z.array(statDefSchema).optional(),
  startingBudget: budgetSchema.optional(),
  layout: layoutConfigSchema,
  theme: z.string().optional(),
  i18n: i18nConfigSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  subtrees: z
    .record(
      z.string(),
      z.lazy(() => treeDefSchema),
    )
    .optional(),
})

/**
 * Esquema Zod público que refleja la estructura del tipo TreeDef.
 *
 * Envuelve treeDefShapeSchema en z.lazy para resolver la auto-referencia de
 * `subtrees`, lo que obliga a la anotación z.ZodTypeAny (el tipo base de Zod
 * — NO `any`).
 *
 * La asignabilidad esquema↔TreeDef NO se garantiza con z.ZodType<TreeDef>
 * porque Zod 3 + exactOptionalPropertyTypes la hacen incompatible sin `as`/
 * `any` (ver cabecera, issues Zod #635/#3186/#3293). Se garantiza con el
 * test de tipo del helper tolerante en T7 (decisión del arquitecto, Opción
 * 2), que compara z.infer<typeof treeDefShapeSchema> contra TreeDef de forma
 * cirúrgica: el contrato sigue verificado en compilación, sin `as`/`any` en
 * producción.
 *
 * @see InferredTreeDef y el test de tipo en TreeDefValidator.test
 */
export const treeDefSchema: z.ZodTypeAny = z.lazy(() => treeDefShapeSchema)

/**
 * InferredTreeDef — el tipo de un TreeDef TRAS la validación runtime con
 * treeDefShapeSchema (es decir, lo que devuelve validateTreeDef en éxito).
 *
 * Difiere de `TreeDef` (types/tree.ts) ÚNICAMENTE en el artefacto conocido
 * de Zod 3 bajo exactOptionalPropertyTypes: las propiedades opcionales se
 * infieren como `?: T | undefined` en lugar de `?: T`. En todo lo demás
 * (campos, tipos base, requeridos vs opcionales, forma anidada) es idéntico
 * a `TreeDef`. Esa equivalencia NO es una afirmación de confianza: está
 * probada en compilación por el helper tolerante + el test negativo de tipo
 * de T7 (decisión del arquitecto, Opción 2; cualquier divergencia distinta
 * del `| undefined` opcional rompe la compilación del test).
 *
 * Es contrato público: se exporta del paquete. Los consumidores de
 * validateTreeDef / JsonSerializer.deserialize / TreeEngine.fromJSON reciben
 * este tipo (no `TreeDef` nominal), de forma coherente en todo el flujo.
 */
export type InferredTreeDef = z.infer<typeof treeDefShapeSchema>
// ── FIN: treeDefSchema (Zod) ──
