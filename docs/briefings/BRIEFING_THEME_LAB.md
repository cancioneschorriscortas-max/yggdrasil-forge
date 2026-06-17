# BRIEFING — sub-fase F10.x `theme-lab` de Yggdrasil Forge

> **4º Arquitecto (Director) → Executor.**
> **Playground de tema en vivo no demo.** Un panel «Theme Lab» con mandos
> (cores dos 5 estados, fill, texto, fondo do lenzo, grosor de anel) que se
> aplican **en directo** á árbore, con dous **presets** (plano-claro /
> escuro-limpo) e botón **copiar valores**. Serve para que Agarfal afine a
> paleta co ollo e en minutos, e despois báncanse os valores. **Só demo
> (`examples/react-demo`)** → non-publicable, **sen changeset**.

---

## 1. Por que

A estrutura do nodo (F10.3) xa é correcta; o único que queda é **afinar
cores**, e o bucle Director→Executor→captura é caro para iso. Este
playground pon os mandos en mans de Agarfal: tunea en vivo, decide
claro-vs-escuro, e exporta os valores para bancalos no tema por defecto.

> **Prerrequisito:** require a estrutura de F10.3 plano-adaptativo aplicada
> (anel = `stroke` por estado, `--yf-color-node-fill`, `--yf-ring-width`).
> Se F10.3 aínda non está en local, aplícase antes (ou nesta mesma rama).

## 2. Estado á entrada

`examples/react-demo` co F10.3 plano-adaptativo. O demo usa `ThemeProvider`
(de `@yggdrasil-forge/react`) cun tema en `theme.ts`. O `SVGRenderer`
inxecta `--yf-color-*` desde o `Theme`; o demo pode engadir vars extra
(`--yf-color-node-fill`, `--yf-ring-width`, fondo do lenzo) vía `style`
inline nun wrapper.

## 3. Decisións (NON discutibles)

1. **Só demo.** Cero cambios en `packages/*`. Cero changeset.
2. Componente novo `examples/react-demo/src/ThemeLab.tsx` (panel
   colapsable). Estado local (`useState`) co tema en vivo.
3. Mandos:
   - `<input type="color">` para: `nodeLocked`, `nodeUnlockable`,
     `nodeUnlocked`, `nodeMaxed`, `nodeInProgress`, `text`, `edge`,
     **node-fill**, **fondo do lenzo**.
   - `<input type="range">` para **grosor de anel** (`--yf-ring-width`, 1–8).
   - **Presets** (botóns): «Plano claro» e «Escuro limpo» (cargan paletas).
   - Botón **«Copiar valores»** → copia ao portapapeis un obxecto JSON co
     tema actual (para bancar).
4. Aplicación en vivo:
   - As cores coñecidas do `Theme` → vía `<ThemeProvider theme={live}>`.
   - `--yf-color-node-fill`, `--yf-ring-width` e o **fondo do lenzo** → vía
     `style` inline no wrapper que envolve a `<SkillTree>`.
5. **Presets** (valores iniciais — Agarfal afínaos):
   - **Plano claro**: lenzo `#f4f4ef`; fill `#ffffff`; text `#2c2c2a`;
     locked `#9a958a`, unlockable `#c08a2e`, unlocked `#4f9a3f`,
     maxed `#d4a017`, in_progress `#c77a2e`; ring-width 3.
   - **Escuro limpo**: lenzo `#11131a`; fill `#2a2f3d`; text `#e6d5a8`;
     locked `#5b6b86`, unlockable `#e0a93c`, unlocked `#6fcf97`,
     maxed `#f0c14b`, in_progress `#e08a3c`; ring-width 3.
6. **Nota (escríbese no panel):** «No fondo escuro, os emojis nativos non se
   ven — iso resólvese migrando a iconos recoloreables (sub-fase futura).»

## 4. Tarefas (T0–T5)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs). exactOptional: cero `undefined`.

### T0 — Preflight
Estado co F10.3 plano-adaptativo aplicado. Identidade git.

### T1 — `examples/react-demo/src/ThemeLab.tsx` (NOVO)
- Componente que recibe `value` (o tema en vivo) e `onChange`, e renderiza:
  - cabeceira colapsable «Theme Lab».
  - os botóns de preset (cargan as paletas de §3.5 vía `onChange`).
  - filas de `<input type="color">` etiquetadas (unha por cor de §3.3).
  - slider de grosor de anel.
  - botón «Copiar valores» (`navigator.clipboard.writeText(JSON.stringify(value, null, 2))`).
  - a nota do emoji (§3.6).
- **Cero** dependencias novas; só React + CSS inline/clases do demo.

### T2 — Integrar no `App.tsx`
- Estado `const [themeVals, setThemeVals] = useState(<preset "Escuro limpo">)`.
- Construír o `Theme` a partir de `themeVals` (mapear ás claves que espera
  `ThemeProvider`; **GREP a forma real de `Theme`** en `@react` antes —
  non inventes claves).
- Envolver a árbore:
  ```tsx
  <div style={{ background: themeVals.canvas, '--yf-color-node-fill': themeVals.fill, '--yf-ring-width': String(themeVals.ringWidth) } as CSSProperties}>
    <ThemeProvider theme={builtTheme}>
      <SkillTree engine={engine} onNodeClick={handleNodeClick} />
    </ThemeProvider>
  </div>
  ```
- Render `<ThemeLab value={themeVals} onChange={setThemeVals} />` nun lateral
  (panel colapsable). **GREP** se o demo importa `SkillTree` de `/headless`
  (sen tema por defecto) — manter ese import.

### T3 — `styles.css` do demo
- Estilos mínimos do panel (etiquetas, filas, botóns) coas convencións do
  demo. O fondo do lenzo agora vén do `style` inline (T2), non do CSS fixo.

### T4 — Verificación
- `pnpm --filter @yggdrasil-forge-examples/react-demo build` (ou typecheck)
  verde. O resto do gate non se ve afectado (só demo).
- Cargar mentalmente: presets aplican; color pickers actualizan en vivo;
  copiar funciona.

### T5 — Commit + patch
```
feat(demo): Theme Lab — live theme playground (colors, ring width, presets, copy) (theme-lab)

- ThemeLab.tsx: live color pickers (5 states + fill + text + edge + canvas), ring-width slider, flat-light/dark-clean presets, copy-values
- App.tsx: live theme state applied via ThemeProvider + inline CSS vars
- demo only; no library changes; no changeset
```
- `git format-patch -1 HEAD`.
- Copia este briefing a `docs/briefings/BRIEFING_THEME_LAB.md`.

## 5. Ficheiros esperados no diff (lista pechada)
```
examples/react-demo/src/ThemeLab.tsx          (A)
examples/react-demo/src/App.tsx               (M)
examples/react-demo/src/styles.css            (M)
docs/briefings/BRIEFING_THEME_LAB.md          (A)
```
Calquera ficheiro en `packages/*` = erro → **PARA e escala**.

## 6. Que NON facer
- ❌ NON tocar `packages/*` (é só demo).
- ❌ NON crear changeset.
- ❌ NON inventar a forma de `Theme` nin a API do engine (GREP).
- ❌ NON migrar emoji→iconos aquí (sub-fase futura; só a nota no panel).

## 7. Resultado esperado / uso
Agarfal abre o demo, despregа «Theme Lab», proba os dous presets, axusta as
cores ata que os orbes resalten (anel lexible, icono visible, fill
coherente), decide **claro vs escuro**, e preme **«Copiar valores»**.
Ese JSON pásamo e báncoo no tema por defecto do demo (e serve de base para
o tema de Oberón). **Aí remata a adiviñación de cores.**

## 8. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T5) · `📂 DIFF` (== §5) ·
- `🔎 API` (forma real de `Theme` + import de `SkillTree`) ·
- `🟢 BUILD` (demo build/typecheck) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing theme-lab. 4º Arquitecto. Os mandos, na túa man. 🌳*
