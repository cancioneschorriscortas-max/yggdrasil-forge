// ── INICIO: structuralValidator ──
// O validador máis duro: pasa o TreeDef polo validador do motor
// (@core/engine/TreeDefValidator). Se o motor di "este tree non é
// estruturalmente válido", BLOQUEAMOS — non queremos que o documento
// pase a un estado que o motor rexeitaría ao executar.
//
// Cubre regras como: campos requiridos, formas inválidas, IDs
// duplicados detectados polo schema, layout config inválido, etc.

import { validateTreeDef } from '@yggdrasil-forge/core'
import type { EditorDocument } from '../document/EditorDocument.js'
import type { ValidationIssue, Validator } from './Validator.js'

export const structuralValidator: Validator = (doc: EditorDocument) => {
  const result = validateTreeDef(doc.tree)
  if (result.ok) return []
  const issue: ValidationIssue = {
    severity: 'error',
    code: result.error.code,
    message: { en: result.error.message },
  }
  return [issue]
}
// ── FIN: structuralValidator ──
