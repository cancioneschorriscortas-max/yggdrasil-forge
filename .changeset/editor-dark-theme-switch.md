---
'@yggdrasil-forge/editor-react': minor
---

feat(editor): tema escuro do chrome + selector claro/escuro (briefing 7.8)

**Paleta escura refrescada** (`tokens.css`, `[data-editor-theme="dark"]`):
fondo case-negro profundo (`#16171b`/`#0f1013`/`#131418`), paneis
lixeiramente máis claros, texto gris-claro, acento azul (`#3b82f6`).
Comparación completa cos tokens do bloque claro — sen orfos. Os alias
xerais (`--editor-accent`, `--editor-border`) seguen a mesma
equivalencia documentada que xa tiña o bloque claro (mesmo que
`authoring`/`strong`, respectivamente).

**Selector claro/escuro no TopBar**: switch compacto (☀/🌙) á
esquerda do toggle Autoría/Proba, `role="switch"` + `aria-checked` +
`aria-label="Tema escuro"`. Só se renderiza se `EditorShell` recibe a
prop `theme`.

**Wiring controlado desde a app** (fronteira limpa biblioteca/app):
`EditorShell` gaña `theme?: 'light' | 'dark'` e
`onThemeChange?: (theme) => void`, reenviados ao TopBar. A biblioteca
NON toca `document` nin `localStorage` — iso é responsabilidade da
app consumidora (ver `examples/editor/src/main.tsx`: estado do tema,
persistencia en `localStorage` baixo `ygg-editor-theme`, aplicación a
`document.documentElement.dataset.editorTheme`).

**Anti-flash** en `examples/editor/index.html`: script que le o tema
gardado antes de que cargue React/CSS, máis un bloque `<style>` de
fallback consciente do tema, para evitar un flash claro ao arrincar en
escuro.

**Cobertura dockview**: revisadas as vars `--dv-*` non mapeadas —
confirmado que as non cubertas son ou ben internas doutros temas de
dockview non usados (abyss/gh/mocha/monokai/nord/sol) ou translúcidas
por deseño (sash, drag-over, scrollbar), sen risco visual adicional
sobre o traballo xa feito en 7.5e (grupo/tabs/separadores).

Fóra de alcance (explícito no briefing): logo/iconas novas no TopBar,
texto "Panels" en inglés, lupa de zoom, `prefers-color-scheme`
automático, refactor do duplicado `shell.css`/`styles.css`.
