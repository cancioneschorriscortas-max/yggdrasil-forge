// ── INICIO: treeDefSchema.type-test (1.17) ──
//
// PRUEBA DE TIPO — NO ES MÓDULO DE PRODUCCIÓN.
//
// Este fichero NO contiene runtime (no se ejecuta nada), NO se exporta como
// valor y NINGÚN módulo de producción lo importa. Vive en `src/`
// DELIBERADAMENTE: el tsconfig.json del core tiene `include: ["src/**/*"]` y
// `exclude: [..., "__tests__"]`, por lo que `pnpm typecheck` valida este
// fichero pero NO validaría uno en `__tests__/` (vitest tampoco tiene
// test.typecheck activado). Colocarlo aquí hace que el helper y el test
// negativo @ts-expect-error sean EFECTIVOS y permanentes (se comprueban en
// cada `pnpm typecheck`), no decorativos.
//
// Si algún día se activa typecheck sobre `__tests__/` (vitest test.typecheck
// o quitar el exclude del tsconfig), este fichero se migraría a `__tests__/`.
//
// Implementa las condiciones del arquitecto (escalado #6, Opción 3):
//  1. Helper basado en DOBLE ASIGNABILIDAD DIRIGIDA (NO IsExactlyEqual: la
//     igualdad invariante no es viable sobre TreeDef por ser auto-referente
//     vía `subtrees` y `NodeDef.subtreeOverrides`; la asignabilidad sí
//     maneja tipos recursivos).
//  2. Normalización de `readonly` en AMBOS lados (DeepMutable): TreeDef es
//     readonly exhaustivo y Zod infiere mutable; sin esto habría un punto
//     ciego.
//  3. Relajación de `|undefined` DIRIGIDA y MÍNIMA: solo propiedades
//     opcionales, solo en un lado. Cualquier otra divergencia (campo
//     extra/menos, tipo base, requerido↔opcional) hace fallar una de las
//     direcciones.

import type { TreeDef } from '../types/index.js'
import type { InferredTreeDef } from './treeDefSchema.js'

// ───────────────────────────────────────────────────────────────────────────
// HELPER: doble asignabilidad dirigida con normalización readonly
// ───────────────────────────────────────────────────────────────────────────

// DeepMutable: quita `readonly` recursivamente. La asignabilidad estructural
// en TS maneja tipos recursivos (a diferencia de la igualdad invariante
// normalizada, que sobre TreeDef auto-referente degrada), por lo que esta
// recursión es segura. Las funciones se dejan intactas.
type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyArray<infer E>
    ? Array<DeepMutable<E>>
    : T extends object
      ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
      : T

// Claves opcionales (admiten ausencia) y requeridas.
type OptionalKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? K : never
}[keyof T]
type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>

// RelaxOptional: en propiedades OPCIONALES añade `| undefined` al valor
// (exactamente la dimensión que Zod 3 introduce bajo
// exactOptionalPropertyTypes). Las REQUERIDAS quedan intactas. Recursivo.
// Se aplica SOLO a un lado en cada dirección de la comparación: así la
// tolerancia es dirigida y mínima.
type RelaxOptional<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyArray<infer E>
    ? Array<RelaxOptional<E>>
    : T extends object
      ? {
          [K in RequiredKeys<T>]: RelaxOptional<T[K]>
        } & {
          [K in OptionalKeys<T>]?: RelaxOptional<T[K]> | undefined
        }
      : T

// Doble asignabilidad dirigida, ambos lados normalizados a mutable:
//  - Dirección 1: DeepMutable<A> debe encajar en B con opcionales relajados
//    (cubre el artefacto Zod en A->B).
//  - Dirección 2: DeepMutable<B> debe encajar en A con opcionales relajados
//    (cubre el artefacto en B->A).
// Si ambas se cumplen, A y B son iguales MÓDULO el `|undefined` opcional.
// Cualquier otra divergencia (campo extra/menos, tipo base distinto,
// requerido↔opcional) rompe al menos una dirección. Las tuplas [.] evitan
// la distributividad sobre uniones.
type EqualModuloExactOptional<A, B> = [DeepMutable<A>] extends [RelaxOptional<DeepMutable<B>>]
  ? [DeepMutable<B>] extends [RelaxOptional<DeepMutable<A>>]
    ? true
    : false
  : false

// ───────────────────────────────────────────────────────────────────────────
// TEST DE TIPO POSITIVO (condición central de 5.2 / Opción 2)
// ───────────────────────────────────────────────────────────────────────────
//
// InferredTreeDef (lo que devuelve validateTreeDef) es igual a TreeDef
// MÓDULO el artefacto `?:T|undefined`. La aserción `: true =` solo compila
// si el helper devuelve exactamente `true`: equivalencia esquema↔TreeDef
// demostrada en compilación, sin `as`/`any` en producción.
type _SchemaMatchesTreeDef = EqualModuloExactOptional<InferredTreeDef, TreeDef>
const _schemaMatches: _SchemaMatchesTreeDef = true as _SchemaMatchesTreeDef
const _schemaMatchesAssert: true = _schemaMatches
void _schemaMatchesAssert

// ───────────────────────────────────────────────────────────────────────────
// TEST NEGATIVO DE TIPO (condición 2 del arquitecto: anti-falsa-seguridad)
// ───────────────────────────────────────────────────────────────────────────
//
// Formas DELIBERADAMENTE ROTAS respecto a TreeDef. El helper DEBE devolver
// `false` para ellas; por tanto `const _x: true = false as <Neg>` produce un
// error de tipo, capturado por @ts-expect-error. Si el helper fuese laxo
// (devolver true para una forma rota), el tipo Neg sería `true`,
// `false as true` seguiría dando error... por eso la aserción se construye
// para que SOLO falle si el helper acierta: ver nota en cada caso. Si el
// helper NO discriminara, @ts-expect-error quedaría sin usar y el fichero no
// compilaría. Que compile prueba que el helper discrimina cada caso.

// (a) Tipo base distinto: `id` string -> number. Helper debe dar false.
interface BrokenWrongBaseType extends Omit<TreeDef, 'id'> {
  readonly id: number
}
type _NegWrongBase = EqualModuloExactOptional<BrokenWrongBaseType, TreeDef>
// _NegWrongBase es `false`. `const _x: _NegWrongBase = true` => error
// (true no asignable a false). @ts-expect-error lo captura. Si el helper
// fallara y diera `true`, no habría error y la directiva quedaría sin usar.
// @ts-expect-error El helper DEBE devolver false (id:number ≠ id:string).
const _negWrongBase: _NegWrongBase = true
void _negWrongBase

// (b) Campo requerido eliminado: falta `nodes`.
type BrokenMissingRequired = Omit<TreeDef, 'nodes'>
type _NegMissing = EqualModuloExactOptional<BrokenMissingRequired, TreeDef>
// @ts-expect-error El helper DEBE devolver false (falta el requerido nodes).
const _negMissing: _NegMissing = true
void _negMissing

// (c) Campo de más: clave extra que TreeDef no tiene.
interface BrokenExtraField extends TreeDef {
  readonly __extra: string
}
type _NegExtra = EqualModuloExactOptional<BrokenExtraField, TreeDef>
// @ts-expect-error El helper DEBE devolver false (clave extra inexistente).
const _negExtra: _NegExtra = true
void _negExtra

// (d) Requerido↔opcional: `id` pasa de requerido a opcional.
type BrokenRequiredToOptional = Omit<TreeDef, 'id'> & {
  readonly id?: string
}
type _NegReqOpt = EqualModuloExactOptional<BrokenRequiredToOptional, TreeDef>
// @ts-expect-error El helper DEBE devolver false (requerido->opcional en id).
const _negReqOpt: _NegReqOpt = true
void _negReqOpt

// (e) Forma anidada distinta: `label` LocalizedString -> number.
interface BrokenWrongNested extends Omit<TreeDef, 'label'> {
  readonly label: number
}
type _NegNested = EqualModuloExactOptional<BrokenWrongNested, TreeDef>
// @ts-expect-error El helper DEBE devolver false (forma anidada distinta).
const _negNested: _NegNested = true
void _negNested
// ── FIN: treeDefSchema.type-test (1.17) ──
