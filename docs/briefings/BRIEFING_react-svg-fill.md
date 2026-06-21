# BRIEFING — Fix @react · O svg do skill-tree enche o seu contedor por defecto

> **Para o Executor.** Autocontido, **contexto cero**. Lée todo antes de tocar.
> Se o estado real non coincide co T0, **para e reporta ao Director**.
>
> **Director:** 5º Arquitecto · **Esforzo:** S · **Toca @react?** ✅ (só `@react`)
> **Changeset:** patch (@react) · **Tipo:** fix (causa raíz, design-wide)

---

## 0. Motivo

No pase Layout L detectouse unha **banda morta** no lenzo do exemplo: o
`<svg className="yf-skill-tree">` renderizaba ao seu tamaño **intrínseco** do
viewBox en vez de encher o contedor. O exemplo tapouno coa súa CSS, pero a
**causa raíz está en `@react`**: o svg declara `viewBox` pero **non `width/height`
por defecto**. Calquera consumidor que solte `<SkillTree>` (ou `<SkillTreeStatic>`)
nun contedor dimensionado vai chocar coa mesma banda morta.

Isto importa especialmente porque o obxectivo do repo é **que se replique sen
erros**. O fix: que o svg **encha o seu contedor por defecto**, sobreescribíbel.

---

## 1. CONVENCIÓNS

- Biome estrito (`noExplicitAny` error, sen `!`, `import type`, dot-notation).
- `exactOptionalPropertyTypes`: spread condicional para props opcionais.
- Aditivo: comportamento por defecto novo, pero **sobreescribíbel** (cero breaking).
- Sen heredocs para `.tsx`. Clone fresco + `HUSKY=0` en CI. Cero regresión.

---

## 2. T0 — VERIFICACIÓN (grep)

```bash
cd <repo>
# Os dous svg afectados: declaran viewBox pero non width/height
grep -n 'className="yf-skill-tree"' packages/react/src/SVGRenderer.tsx packages/react/src/SkillTreeStatic.tsx
grep -n "svgStyle\|style=\|width=\|height=" packages/react/src/SVGRenderer.tsx | head
sed -n '76,90p' packages/react/src/SkillTreeStatic.tsx
```
Esperado: `SVGRenderer` aplica `style` só se `svgStyle !== undefined`;
`SkillTreeStatic` non aplica style/width/height. Se difire, **para**.

---

## 3. T1 — `SVGRenderer.tsx` (o interactivo)

O svg debe levar un **estilo base** que encha o contedor, **mesturado** co
`svgStyle` do consumidor (o consumidor gaña). Substitúe o spread condicional do
style por un estilo base + override:

```tsx
// Base: enche o contedor; display:block evita o gap de inline-svg.
// O svgStyle do consumidor sobreescribe calquera destes.
style={{ display: 'block', width: '100%', height: '100%', ...svgStyle }}
```

(Se `svgStyle` podía ser `undefined`, `...undefined` é seguro en spread de
obxecto. Mantén o resto de atributos —`viewBox`, `role`, `aria-label`, `ref`,
`data-*`— igual.)

---

## 4. T2 — `SkillTreeStatic.tsx` (o SSR/estático)

Mesmo criterio. Engade ao `<svg className="yf-skill-tree" ...>` un estilo base
sobreescribíbel:

```tsx
style={{ display: 'block', width: '100%', height: '100%' }}
```

(Se este compoñente expón unha prop de estilo/tamaño, mestúraa despois para
permitir override; se non a expón, o estilo base abonda. Non engadas props novas
salvo que xa exista o patrón.)

---

## 5. T3 — Tests + README

- **Tests** (`@react`): no patrón de tests existente do paquete, engade/estende un
  caso que renderice o svg e asegure que leva `width: 100%` / `height: 100%`
  por defecto (e que un `svgStyle` consumidor os pode sobreescribir, se `SVGRenderer`
  acepta esa prop). Cobertura 100 % no tocado.
- **README de `@react`**: nota curta — "o `<SkillTree>` enche o seu contedor por
  defecto; dálle tamaño ao contedor pai (ou sobreescribe vía `svgStyle`)". Isto é
  a doc que evita que o próximo usuario tropece coa banda morta.

---

## 6. GATE

```bash
HUSKY=0
pnpm install
pnpm lint:fix && pnpm format
pnpm lint && pnpm format:check
pnpm turbo run typecheck --force
pnpm turbo run test --force
pnpm --filter @yggdrasil-forge/react run test:coverage   # 100 no tocado
```
Cero regresión (core 1760, react 303 +novos, etc.). O exemplo segue compilando
(`cd examples/react-demo && pnpm typecheck && pnpm build`) — e a súa CSS de
workaround pode quedar (xa non fai dano) ou simplificarse; non é obrigatorio tocala.

---

## 7. ENTREGA + CHECKLIST

- Sen heredocs. Un commit narrativo. `git format-patch -1 HEAD`. Director aplica
  con `git am --keep-cr`; borra copia local do briefing antes.

- [ ] `SVGRenderer` svg con estilo base `display:block; width/height:100%`, override vía `svgStyle`.
- [ ] `SkillTreeStatic` svg igual.
- [ ] Test que verifica o fill por defecto.
- [ ] Changeset patch (@react) + nota no README.
- [ ] Gate verde, cobertura 100 % no tocado, cero regresión.

**Resultado:** soltar `<SkillTree>` nun contedor dimensionado xa enche sen banda
morta, sen CSS extra do consumidor. Un erro menos para quen replique o repo.

---

*Briefing fix svg-fill · 5º Arquitecto · pre-resolto para execución sen consulta.*
