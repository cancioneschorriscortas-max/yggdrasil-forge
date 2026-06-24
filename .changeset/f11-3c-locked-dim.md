---
"@yggdrasil-forge/react": minor
---

feat(react): atenúa badge de nodos `locked` (F11.3c). En `SkillNode`, os badges raster (rutas, `data:` URIs, ou cadeas con extensión de imaxe) renderízanse con `filter: grayscale(1) brightness(0.5)` cando o estado do nodo é `'locked'`. Pensado para que cos badges grandes e vívidos (F11.3b) o estado de bloqueado salte á vista. **Só afecta á imaxe** — o anel conserva a súa cor de estado, e `IconGlyph` (glyphs vector) e o fallback `<text>` (emoji) **non se tocan**. Outros estados (`unlockable`, `in_progress`, `unlocked`, `maxed`, `disabled`, `expired`) renderizan o badge vívido.
