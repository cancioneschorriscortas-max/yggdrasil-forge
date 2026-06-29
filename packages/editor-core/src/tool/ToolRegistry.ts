// ── INICIO: ToolRegistry ──
// Rexistro mutable de tools. O controller activa unha por id.

import type { Tool } from './Tool.js'

export interface ToolRegistry {
  register(tool: Tool): void
  unregister(id: string): void
  get(id: string): Tool | undefined
  list(): readonly Tool[]
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>()
  return {
    register(tool: Tool): void {
      tools.set(tool.id, tool)
    },
    unregister(id: string): void {
      tools.delete(id)
    },
    get(id: string): Tool | undefined {
      return tools.get(id)
    },
    list(): readonly Tool[] {
      return [...tools.values()]
    },
  }
}
// ── FIN: ToolRegistry ──
