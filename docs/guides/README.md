# Guías de Yggdrasil Forge

Esta carpeta contén as guías de uso e desenvolvemento de **Yggdrasil Forge** — o motor open-source de grafos de progresión (skill trees, currículos, tech trees).

A documentación está dividida en tres niveis segundo o que vaias facer:

## 📘 [01 — Guía do editor](./01-editor-user-guide.md)
**Para usuarios do editor**. Aprende a usar a UI:
- Os catro paneis (Outliner, Canvas, Inspector, Problems).
- Seleccionar, mover, arrastrar, undo.
- Editar campos escalares (label, color, type, …) e estruturados (exclusions, cost, effects).
- Entender e resolver warnings do panel Problems.

**Empeza aquí** se queres construír un skill tree sen mirar o código.

## 🏛 [02 — Guía de arquitectura](./02-architecture-guide.md)
**Para colaboradores do código (Arquitecto, Executor)**. Como están organizadas as pezas:
- As cinco capas: `@core`, `@common`, `@react`, `@editor-core`, `@editor-react`.
- O fluxo dunha edición: Command → Transaction → Validation → Commit → re-render.
- Property Registry (cómo o editor describe que se pode editar).
- Soft validators (cómo o editor detecta problemas).
- ★ O loop conciencia↔voz e o gate manifesto-descriptor.

**Empeza aquí** se queres entender como funciona o editor por dentro antes de tocalo.

## 🧩 [03 — Guía de extensión](./03-extension-guide.md)
**Para devs que engaden funcionalidade**. Receitas paso a paso:
- Engadir un campo escalar editable no Inspector.
- Engadir un sub-editor estruturado novo.
- Engadir un soft validator novo (un warning que aparece en Problems).
- Engadir un tipo de Effect novo (e que apareza automaticamente no Inspector).
- Engadir un PropertyType novo (kind:'rich-text', 'duration', …).

**Empeza aquí** se queres tocar o código para sumar capacidades.

---

## Convencións

- **★** marca seccións sobre decisións arquitecturais críticas (loop conciencia-voz, gate manifesto, cicatrices históricas).
- **`@nome-paquete`** refire a un paquete do monorepo (`@yggdrasil-forge/core`, `@yggdrasil-forge/editor-react`, …).
- **Diagramas en Mermaid** (renderízaos GitHub por defecto).
- Os exemplos de código asumen versión actual do código en `main`. Se o teu repo está nun fork con cambios, lee a guía como referencia mental, non como cita literal.

## Estado das guías

| Guía | Estado | Última revisión |
|---|---|---|
| 01 — Editor | ✅ v1 | sesión post-7.5c-ii fase 1 |
| 02 — Arquitectura | ✅ v1 | sesión post-7.5c-ii fase 1 |
| 03 — Extensión | ✅ v1 | sesión post-7.5c-ii fase 1 |

As guías son **documentos vivos**. Cando avanzas en fases (7.5c-ii fase 2, 7.5d, etc.), engade unha sección nas guías relevantes en lugar de crear un README de release notes.
