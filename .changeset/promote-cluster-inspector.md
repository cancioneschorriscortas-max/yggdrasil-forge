---
'@yggdrasil-forge/react': minor
---

feat(react): promote `ClusterCardsView` and `NodeInspector` from example

GAIA, the second real consumer, asked to adopt the tarxetas-lista view
plus the per-node inspector that lived inside the oberon-panadeiro
example. Since GAIA is JS-only (CRA), copying `.tsx` was not an option;
promoting to the published package was the clean path.

New public API on `@yggdrasil-forge/react`:

- `ClusterCardsView` — a list-of-cards view of any tree, with local
  pan/zoom (drag + wheel, identical UX to `SkillTree` but on HTML).
  Positions are optional: when missing for a group id, an automatic
  ring around the center is used so the component works on any
  profession without a hardcoded map.
- `NodeInspector` — side panel with the node detail (header, badge,
  description, levels with state, key action, increase-tier button,
  optional video). i18n via `locale` (default `'en'`) and `strings`
  partial override. Video render injectable via `renderVideo` prop so
  consumers can plug their own media player.
- Pure logic helpers `rowState`, `rowBadge` (cluster) and `tierRowsFor`,
  `badgeKind`, `badgeText` (inspector), plus the matching state types
  `RowState`, `TierState`, `TierRow`. Useful for consumers that build
  their own variants on top of the same rules.

Both components are self-styled with inline styles (matching the
package convention) and expose stable `yf-cluster-*` / `yf-node-inspector-*`
class names for consumer override. No CSS file to import. Zero
sideEffects.

The oberon-panadeiro example now consumes the promoted components and
deletes its local copies; it acts as the first real test of the API.
