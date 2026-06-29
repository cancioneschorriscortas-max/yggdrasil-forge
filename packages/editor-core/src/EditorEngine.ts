// ── INICIO: EditorEngine ──
// O corazón do Editing Engine. Punto único de despacho de Commands +
// orquestación do pipeline:
//
//   Command → Transaction → Validation → Document → Snapshot.
//
// Disciplina (a mesma que TreeEngine.unlock()→rollback en @core):
//   - A validación corre **unha vez** ao final dunha transacción,
//     sobre o candidato completo.
//   - Se algún issue ten severity='error', a transacción REXÉITASE:
//     `currentDocument` non se toca, a history non se toca, e o
//     candidato simplemente déixase ir (Immer non muta o orixinal).
//   - Se a validación pasa, o candidato pasa a ser o novo
//     `currentDocument`, o `previous` empuxa á history para undo, e
//     notifícase aos subscriptores.
//
// **Atomicidade gratis**: como Immer non muta o orixinal, descartar a
// referencia ao candidato deixa todo intacto. Cero "limpar
// efectos" — a referencia simplemente vaise polo GC.

import type { LocalizedString } from '@yggdrasil-forge/common'
import { ErrorCode, type Result, YggdrasilError, err, ok } from '@yggdrasil-forge/core'
import { produce } from 'immer'
import type { Command } from './command/Command.js'
import type { EditorDocument } from './document/EditorDocument.js'
import { History, type HistoryOptions } from './history/History.js'
import { type EditorSession, createSession } from './session/EditorSession.js'
import {
  type ValidationIssue,
  type Validator,
  ValidatorRegistry,
  hasErrors,
} from './validation/Validator.js'
import { referentialIntegrityValidator } from './validation/referentialIntegrityValidator.js'
import { structuralValidator } from './validation/structuralValidator.js'
import { uniqueIdsValidator } from './validation/uniqueIdsValidator.js'

export interface EditorEngineOptions {
  /**
   * Validadores ADEMAIS dos duros por defecto (structural, uniqueIds,
   * referentialIntegrity). Soft validators (warning/info) do consumidor
   * pasan por aquí.
   */
  readonly validators?: readonly Validator[]
  readonly maxHistory?: number
}

/** Contexto pasado ao callback de `transaction(fn)`. */
export interface TransactionContext {
  /** Aplica un Command ao candidato actual da transacción. */
  apply(command: Command): void
}

/** Listener de cambios no currentDocument. */
export type EditorEngineListener = (doc: EditorDocument) => void

export class EditorEngine {
  private currentDocument: EditorDocument
  private readonly session: EditorSession
  private readonly registry: ValidatorRegistry
  private readonly history: History
  private currentIssues: readonly ValidationIssue[] = []
  private readonly listeners = new Set<EditorEngineListener>()

  constructor(document: EditorDocument, options?: EditorEngineOptions) {
    this.currentDocument = document
    this.session = createSession(document)

    this.registry = new ValidatorRegistry()
    // Os tres validadores duros — sempre activos.
    this.registry.register(structuralValidator)
    this.registry.register(uniqueIdsValidator)
    this.registry.register(referentialIntegrityValidator)
    // Validadores extra do consumidor.
    if (options?.validators !== undefined) {
      for (const v of options.validators) this.registry.register(v)
    }

    const historyOpts: HistoryOptions =
      options?.maxHistory !== undefined ? { maxDepth: options.maxHistory } : {}
    this.history = new History(historyOpts)

    // Issues iniciais (snapshot do estado de partida).
    this.currentIssues = this.registry.run(document)
  }

  // ── Acceso a estado ─────────────────────────────────────────────

  getDocument(): EditorDocument {
    return this.currentDocument
  }

  getSession(): EditorSession {
    return this.session
  }

  getIssues(): readonly ValidationIssue[] {
    return this.currentIssues
  }

  // ── Despacho ────────────────────────────────────────────────────

  /**
   * Despacha un único Command. Equivalente a abrir unha transacción,
   * aplicar o comando, e pechar.
   */
  dispatch(command: Command): Result<void> {
    return this.transaction(command.label, (tx) => {
      tx.apply(command)
    })
  }

  /**
   * Executa unha transacción composta de varios Commands. O `fn`
   * recibe un contexto co método `apply(cmd)`. A validación corre só
   * unha vez ao final.
   */
  transaction(
    label: LocalizedString | undefined,
    fn: (tx: TransactionContext) => void,
  ): Result<void> {
    // Candidato = documento actual (Immer non muta; produce devolve nova ref).
    let candidate = this.currentDocument
    const tx: TransactionContext = {
      apply(command: Command): void {
        candidate = produce(candidate, (draft) => {
          command.mutate(draft)
        })
      },
    }

    // Executa o callback. Se lanza, propágase (non é un erro de
    // validación — é un bug do caller).
    fn(tx)

    // Se non houbo cambios efectivos, **non bloquees nin commit**:
    // simplemente non hai nada que facer. Devolvemos ok sin tocar
    // history nin issues.
    if (candidate === this.currentDocument) {
      return ok(undefined)
    }

    // Validar o candidato completo.
    const issues = this.registry.run(candidate)
    if (hasErrors(issues)) {
      // REXEITA: documento e history INTACTOS. O candidato esquécese.
      const firstError = issues.find((i) => i.severity === 'error')
      const label = firstError?.code ?? 'validation failed'
      return err(
        new YggdrasilError(ErrorCode.INVALID_TREE_DEF, `transaction rejected: ${label}`, {
          context: { issues },
        }),
      )
    }

    // COMMIT: push previo á history, novo doc activo, notify.
    const previous = this.currentDocument
    this.currentDocument = candidate
    this.session.document = candidate
    this.session.dirty = true
    this.history.push(previous)
    this.currentIssues = issues
    this.notify()
    // O `label` da transacción aínda non se usa (vai engadirse cando
    // History persista metadatos por entrada — v1.1). Mantémolo no
    // tipo para compat de API.
    void label
    return ok(undefined)
  }

  // ── Undo / Redo ─────────────────────────────────────────────────

  canUndo(): boolean {
    return this.history.canUndo()
  }

  canRedo(): boolean {
    return this.history.canRedo()
  }

  undo(): Result<void> {
    const previous = this.history.undo(this.currentDocument)
    if (previous === null) {
      return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, 'nothing to undo'))
    }
    this.currentDocument = previous
    this.session.document = previous
    // Os snapshots da history XA eran válidos cando se gardaron, polo
    // que non revalidamos. (Pero refrescamos os issues para o estado
    // actual, en caso de que os warnings dependeran do estado.)
    this.currentIssues = this.registry.run(previous)
    this.notify()
    return ok(undefined)
  }

  redo(): Result<void> {
    const next = this.history.redo(this.currentDocument)
    if (next === null) {
      return err(new YggdrasilError(ErrorCode.INVALID_TREE_DEF, 'nothing to redo'))
    }
    this.currentDocument = next
    this.session.document = next
    this.currentIssues = this.registry.run(next)
    this.notify()
    return ok(undefined)
  }

  // ── Subscrición ─────────────────────────────────────────────────

  subscribe(listener: EditorEngineListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.currentDocument)
  }
}
// ── FIN: EditorEngine ──
