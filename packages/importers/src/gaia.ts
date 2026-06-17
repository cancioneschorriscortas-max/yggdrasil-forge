// ── INICIO: F9.3.a — importador GAIA (profesión + grupos) ──
import type { LocalizedString } from '@yggdrasil-forge/common'
import { SCHEMA_VERSION } from '@yggdrasil-forge/common'
import type {
  EdgeDef,
  GroupDef,
  LayoutConfig,
  NodeDef,
  TreeDef,
  UnlockRule,
} from '@yggdrasil-forge/core'

// ── Tipos de entrada GAIA (contrato pechado, §4.6) ──

export interface GaiaCanonicalWeight {
  id: string
  label: string
  categoria: string
  peso: number
  icono?: string
}

export interface GaiaGroup {
  id: string
  profesion_id?: string
  label_gl: string
  label_es?: string
  label_en?: string
  icono?: string
  cor?: string
  skill_canonica_dominante?: string
  posicion?: { x: number; y: number }
}

export interface GaiaMicroskill {
  id: string
  label_gl: string
  label_es?: string
  label_en?: string
  que_significa_gl?: string
  que_significa_es?: string
  que_significa_en?: string
  accion_clave_gl?: string
  accion_clave_es?: string
  accion_clave_en?: string
  grupo_id: string
  skill_canonica_id?: string
  icono?: string
  video_url?: string
  video_proveedor?: string
  posicion?: { x: number; y: number }
  conectadas?: string[]
}

export interface GaiaProfession {
  id: string
  rol: string
  bloque: string
  label: string
  icono?: string
  proxeccion?: string
  salario_medio?: number
  risco_automatizacion?: string
  via_formativa?: string
  descricion_curta_gl?: string
  descricion_curta_es?: string
  descricion_curta_en?: string
  epigrafe_gl?: string
  epigrafe_es?: string
  epigrafe_en?: string
  descricion_poetica_gl?: string
  descricion_poetica_es?: string
  descricion_poetica_en?: string
  imaxe_escena_url?: string
  oberon_completo?: boolean
  skills: GaiaCanonicalWeight[]
  grupos: GaiaGroup[]
  microskills: GaiaMicroskill[]
}

export interface GaiaImportOptions {
  version?: string
  layout?: LayoutConfig
  microskillMaxTier?: number
}

// ── Helper i18n (§4.4) ──

/** Constrúe LocalizedString {gl,es,en} omitindo as ausentes. undefined se todas faltan. */
export function toI18n(gl?: string, es?: string, en?: string): LocalizedString | undefined {
  const out: Record<string, string> = {}
  if (gl !== undefined) out.gl = gl
  if (es !== undefined) out.es = es
  if (en !== undefined) out.en = en
  return Object.keys(out).length > 0 ? out : undefined
}

// ── Mapeo interno ──

function toGroupDef(g: GaiaGroup): GroupDef {
  const label: LocalizedString = toI18n(g.label_gl, g.label_es, g.label_en) ?? g.label_gl
  return {
    id: g.id,
    label,
    ...(g.cor !== undefined ? { color: g.cor } : {}),
    ...(g.icono !== undefined ? { icon: g.icono } : {}),
    ...(g.posicion !== undefined ? { position: g.posicion } : {}),
  }
}

function buildRootNode(input: GaiaProfession): NodeDef {
  const description = toI18n(input.epigrafe_gl, input.epigrafe_es, input.epigrafe_en)
  const poetic = toI18n(
    input.descricion_poetica_gl,
    input.descricion_poetica_es,
    input.descricion_poetica_en,
  )
  const short = toI18n(
    input.descricion_curta_gl,
    input.descricion_curta_es,
    input.descricion_curta_en,
  )

  // Metadata do nodo raíz: só gaia.poetic/short se existen
  const gaiaNodeMeta: Record<string, LocalizedString> = {}
  if (poetic !== undefined) gaiaNodeMeta.poetic = poetic
  if (short !== undefined) gaiaNodeMeta.short = short
  const hasGaiaMeta = Object.keys(gaiaNodeMeta).length > 0

  return {
    id: input.id,
    type: 'root',
    label: input.label,
    ...(input.icono !== undefined ? { icon: input.icono } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(hasGaiaMeta ? { metadata: { gaia: gaiaNodeMeta } } : {}),
  }
}

function buildTreeMetadata(input: GaiaProfession): Record<string, unknown> {
  // profession: campos non-first-class (omitir ausentes)
  const profession: Record<string, unknown> = {
    rol: input.rol,
    bloque: input.bloque,
  }
  if (input.salario_medio !== undefined) profession.salario_medio = input.salario_medio
  if (input.proxeccion !== undefined) profession.proxeccion = input.proxeccion
  if (input.risco_automatizacion !== undefined)
    profession.risco_automatizacion = input.risco_automatizacion
  if (input.via_formativa !== undefined) profession.via_formativa = input.via_formativa
  if (input.imaxe_escena_url !== undefined) profession.imaxe_escena_url = input.imaxe_escena_url
  if (input.oberon_completo !== undefined) profession.oberon_completo = input.oberon_completo

  // canonicalWeights: { skillId: peso }
  const canonicalWeights: Record<string, number> = {}
  for (const s of input.skills) {
    canonicalWeights[s.id] = s.peso
  }

  // groupCanonical: { groupId: skill_canonica_dominante }
  const groupCanonical: Record<string, string> = {}
  for (const g of input.grupos) {
    if (g.skill_canonica_dominante !== undefined) {
      groupCanonical[g.id] = g.skill_canonica_dominante
    }
  }

  return {
    gaia: {
      profession,
      canonicalWeights,
      ...(Object.keys(groupCanonical).length > 0 ? { groupCanonical } : {}),
    },
  }
}

// ── INICIO: F9.3.b — microskills + edges ──

function toPrerequisites(conectadas?: string[]): UnlockRule | undefined {
  if (conectadas === undefined || conectadas.length === 0) return undefined
  const conditions = conectadas.map((nodeId) => ({
    type: 'node_unlocked' as const,
    nodeId,
  }))
  const [first] = conditions
  if (conditions.length === 1 && first !== undefined) return first
  return { type: 'all', conditions }
}

function buildMicroskillNode(m: GaiaMicroskill, options?: GaiaImportOptions): NodeDef {
  const description = toI18n(m.que_significa_gl, m.que_significa_es, m.que_significa_en)
  const flavor = toI18n(m.accion_clave_gl, m.accion_clave_es, m.accion_clave_en)
  const prerequisites = toPrerequisites(m.conectadas)

  // metadata.gaia: canonicalSkillId + video (só se non baleiro)
  const gaiaMeta: Record<string, unknown> = {}
  if (m.skill_canonica_id !== undefined) gaiaMeta.canonicalSkillId = m.skill_canonica_id
  if (m.video_url !== undefined && m.video_url !== '') {
    gaiaMeta.video = {
      url: m.video_url,
      ...(m.video_proveedor !== undefined && m.video_proveedor !== ''
        ? { provider: m.video_proveedor }
        : {}),
    }
  }
  const hasGaiaMeta = Object.keys(gaiaMeta).length > 0

  return {
    id: m.id,
    type: 'small',
    label: toI18n(m.label_gl, m.label_es, m.label_en) ?? m.label_gl,
    ...(description !== undefined ? { description } : {}),
    ...(flavor !== undefined ? { content: { flavor } } : {}),
    ...(m.icono !== undefined ? { icon: m.icono } : {}),
    group: m.grupo_id,
    ...(m.posicion !== undefined ? { position: m.posicion } : {}),
    maxTier: options?.microskillMaxTier ?? 3,
    ...(prerequisites !== undefined ? { prerequisites } : {}),
    ...(hasGaiaMeta ? { metadata: { gaia: gaiaMeta } } : {}),
  }
}

function buildEdges(microskills: GaiaMicroskill[]): EdgeDef[] {
  const edges: EdgeDef[] = []
  for (const m of microskills) {
    for (const prereqId of m.conectadas ?? []) {
      edges.push({
        id: `${prereqId}__${m.id}`,
        source: prereqId,
        target: m.id,
        type: 'dependency',
      })
    }
  }
  return edges
}
// ── FIN: F9.3.b ──

// ── API pública ──

/**
 * Importa unha profesión GAIA e devolve un `TreeDef` válido.
 *
 * Mapeo puro (determinista, sen I/O). NON valida dentro; a validación
 * é traballo do motor (`validateTreeDef`). Os tests si validan a saída.
 *
 * Sub-fase F9.3.a: profesión → nodo raíz + grupos. Microskills en 9.3.b.
 */
export function importGaiaProfession(input: GaiaProfession, options?: GaiaImportOptions): TreeDef {
  const version = options?.version ?? '1.0.0'
  const layout: LayoutConfig = options?.layout ?? { type: 'identity' }
  const description = toI18n(input.epigrafe_gl, input.epigrafe_es, input.epigrafe_en)

  return {
    id: input.id,
    schemaVersion: SCHEMA_VERSION,
    version,
    label: input.label,
    ...(description !== undefined ? { description } : {}),
    rootNodeId: input.id,
    nodes: [buildRootNode(input), ...input.microskills.map((m) => buildMicroskillNode(m, options))],
    edges: buildEdges(input.microskills),
    groups: input.grupos.map(toGroupDef),
    layout,
    metadata: buildTreeMetadata(input),
  }
}
// ── FIN: F9.3.a ──
