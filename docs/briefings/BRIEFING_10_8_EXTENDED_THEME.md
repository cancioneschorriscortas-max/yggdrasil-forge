# BRIEFING — sub-fase F10.8 (Aplicación de tema ampliado)

> **4º Arquitecto (Director) → Executor.**
> **O `Theme` deixa de ser só cores de nodo.** Complétase o contrato con
> **typography** (fonte, peso, tracking) e **background** (canvas), aplicados
> **polo renderer** (inline desde `useTheme()`), quitando os hacks do demo
> (Cinzel `!important` en CSS, fondo inline no wrapper). Isto é a **maquinaria**
> que pecha o *gap arquitectónico do `Theme`*; os **temas pulidos** (Oberón,
> educativo) son F13 / un paso de «bancar paleta». «M» no roadmap. Publicable →
> `@react` **minor**. **Human visual check.**
>
> **Honestidade de alcance:** tras 10.8, un tema describe **toda** a estética
> (cores + fonte + fondo), así que crear temas nomeados é só encher datos. Pero
> 10.8 **non envía** eses temas; só a capacidade.

---

## 1. Estado á entrada (verificado polo Director)

- `Theme` = `colors` (text, node*, edge, edgeActive, icon, selected, mesh,
  nodeFill, background?) + `sizes` (strokeWidth, fontSize, fontSizeSmall,
  ringWidth). **Sen typography** (fonte/peso/tracking).
- Só se envía `themes/minimal.ts`.
- **Background NON aplicado polo renderer** (o demo faino inline no wrapper;
  comentario no `SVGRenderer` indica que a vía CSS-var era inestable → usaremos
  **inline directo**, que si é fiable, como o wrapper do demo).
- Tipografía: o demo forza `Cinzel` con `.yf-skill-node text { font-family:
  Cinzel !important }` (hack a eliminar).

## 2. Modelo (NON discutible)

1. **`Theme.typography?`** (obxecto novo, opcional):
   ```typescript
   export interface ThemeTypography {
     readonly fontFamily?: string
     readonly fontWeight?: number | string        // labels (default)
     readonly letterSpacing?: string
     readonly textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
   }
   ```
   Aplícase aos `<text>` de label (e ao fallback de icono-texto) **inline**
   desde `useTheme()`. Fallbacks sensatos (sen typography → comportamento de hoxe).
2. **Background**: `theme.colors.background` aplícase como **inline
   `style.background`** no `<svg>` do `SVGRenderer` (vía fiable; NADA de CSS
   vars/`<style>`). Sen `background` → transparente (como hoxe).
3. **`Theme.colors.surface?`** (opcional, «panel»): se está, debúxase un
   `<rect>` de fondo cubrindo o viewBox (a «tarxeta» detrás da árbore). Sen
   `surface` → nada. *(O panel composible completo é F12; aquí só o token +
   rect simple.)*
4. **Demo**: mover fonte e fondo ao **tema** (typography.fontFamily =
   `'Cinzel, serif'`; colors.background = a cor escura actual). **Eliminar** o
   hack `!important` da fonte e o `background` inline do wrapper. O Theme Lab
   «Fondo do lenzo» pasa a mapear `theme.colors.background`.
5. **Coherencia**: todo inline desde `useTheme()` (patrón F10.3.fix). Cero
   campos obrigatorios.

## 3. Tarefas (T0–T6)

> Scripts en `/tmp/ygg-exec/` (utf-8, sen heredocs, `assert`). exactOptional.

### T0 — Preflight + GREP
HEAD = `origin/main` (`86a2ecf`). Identidade git. GREP e reporta:
- `Theme`/`ThemeColors`/`ThemeSizes` (forma exacta; ¿`background?` xa declarado?).
- `SVGRenderer`: o `<svg>` (onde poñer `style.background`) e o viewBox/bounds
  (para o `<rect>` de surface).
- `SkillNode`: estilo actual do `<text>` de label (para inxectar typography).
- Demo: onde está o hack `!important` de Cinzel e o `background` do wrapper.

### T1 — `theme-types.ts`: typography + surface
- `ThemeTypography` (§2.1) + `Theme.typography?: ThemeTypography`.
- `ThemeColors.surface?: string` (doc «Fondo/tarxeta detrás da árbore»).
- (`background?` xa existe; confírmao.)

### T2 — `SVGRenderer.tsx`: background + surface
- `<svg style={{ ...(theme?.colors.background !== undefined && { background: theme.colors.background }) }}>`
  (combinar co style existente sen pisar). **Inline**, non CSS var.
- Se `theme?.colors.surface`: renderizar un `<rect>` de fondo cubrindo o
  viewBox (x/y/width/height derivados de bounds+padding) como **primeiro fillo**
  (detrás de todo), `fill = surface`.

### T3 — `SkillNode.tsx`: typography nos labels
- Inxectar inline no `<text>` de label (e fallback icono-texto):
  `fontFamily`, `fontWeight`, `letterSpacing`, `textTransform` desde
  `theme?.typography` (cada un con spread condicional; sen typography →
  igual que hoxe).

### T4 — Demo: mover fonte + fondo ao tema; limpar hacks
- `App.tsx`/tema vivo: `typography: { fontFamily: 'Cinzel, serif', ... }`,
  `colors.background = <escuro actual>`. Theme Lab «Fondo do lenzo» → grava en
  `theme.colors.background` (xa controla unha cor; redirixir ao campo do tema).
- `styles.css`: **eliminar** `.yf-skill-node text { font-family: Cinzel
  !important }`. **Eliminar** o `background` inline do wrapper (agora vén do tema).
- `minimal.ts`: opcionalmente darlle `typography` neutra (sans) sensata.

### T5 — Tests
- `Theme`/schema: typography + surface opcionais.
- `SkillNode`: typography aplícase (fontFamily/weight/letterSpacing/transform);
  sen typography → defaults.
- `SVGRenderer`: background inline cando hai `colors.background`; `<rect>` de
  surface cando hai `colors.surface`.
- Gate verde (lint→format→typecheck:packages→test; conta tests).

### T6 — Docs + changeset + commit
- **`docs/GUIDE.md`** (regra do doc vivo): en §5 (tematización), engadir
  `typography` + `background` + `surface` ao shape do `Theme` e un exemplo.
- `RENDERER-STATE.md`: 10.8 ✅; nota «Theme contract completo (cores + sizes +
  typography + background/surface); temas pulidos = F13/bancar paleta».
  Marcar **Renderer 2.0 MVP completo**.
- Changeset `.changeset/f10-8-extended-theme.md` → `@yggdrasil-forge/react`
  minor: `feat(react): extended theme — typography + background + surface applied by renderer; removes demo CSS font/bg hacks (F10.8)`
- Copia este briefing a `docs/briefings/BRIEFING_10_8_EXTENDED_THEME.md`.
- Commit único + `git format-patch -1 HEAD`.

## 4. Ficheiros esperados no diff (lista pechada orientativa)
```
packages/react/src/theme-types.ts                        (M)
packages/react/src/themes/minimal.ts                     (M, se procede)
packages/react/src/SVGRenderer.tsx                       (M)
packages/react/src/SkillNode.tsx                         (M)
packages/react/__tests__/SVGRenderer.test.tsx            (M)
packages/react/__tests__/SkillNode.*.test.tsx            (M)
examples/react-demo/src/App.tsx                          (M)
examples/react-demo/src/ThemeLab.tsx                     (M, se procede)
examples/react-demo/src/styles.css                       (M, quitar hacks)
docs/GUIDE.md                                            (M)
docs/architecture/RENDERER-STATE.md                      (M)
.changeset/f10-8-extended-theme.md                       (A)
docs/briefings/BRIEFING_10_8_EXTENDED_THEME.md           (A)
```
Rutas exactas no T0; se difiren, **adapta e reporta**.

## 5. Que NON facer
- ❌ NON background por CSS var/`<style>` (inestable; usa inline `style`).
- ❌ NON o panel composible completo (é F12; aquí só token surface + rect).
- ❌ NON deixar o hack `!important` da fonte no demo.
- ❌ NON campos obrigatorios (typography/surface/background opcionais).
- ❌ NON esquecer `GUIDE.md` (T6).
- ❌ NON inventar API (GREP T0).

## 6. Human visual check (REGRA SAGRADA)
Agarfal corre o demo: a árbore vese **igual ou mellor** que antes, pero agora
a **fonte e o fondo veñen do tema** (proba: cambiar a fonte/fondo no tema e ver
o efecto; o Theme Lab «Fondo do lenzo» segue funcionando vía
`colors.background`). Sen regresións. Visual check **pendente de Agarfal**.

## 7. Como reportar
- `✅ ESTADO` · `📋 TAREFAS` (T0–T6) · `📂 DIFF` (== §4) ·
- `🔎 GREP T0` · `🟢 GATE` (conta tests) · `👁️ VISUAL` (PENDENTE) ·
- `🧩 PATCH` · `🚨 ESCALADAS` (ou «ningunha»).

---

*Briefing F10.8. 4º Arquitecto. O tema, contrato completo; a árbore, enteiramente súa. 🌳*
