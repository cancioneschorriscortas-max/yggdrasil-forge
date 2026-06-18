# icon-preview

Previsualizador standalone de iconos SVG no formato `IconDef` do paquete `@yggdrasil-forge/react` (sub-fase F10.5).

## Para que serve

1. **Ver como queda un icono novo** antes de rexistralo no código: cargas o teu path SVG, axustas tamaño/cor/fondo, e velo en vivo.
2. **Probar **conjuntos enteiros de iconos** (incluído o `BUILTIN_ICONS` e un set de inspiración norse de ~28 iconos pensado para Yggdrasil) lado a lado.
3. **Servir de base para un futuro panel "Import icons" no Studio editor**: a lóxica do parser de paste (textarea → IconDef → render) é directamente reutilizable.

## Como usalo

Abre o ficheiro directamente nun navegador (cero build, cero install):

```bash
# Desde a raíz do repo:
xdg-open tools/icon-preview/index.html      # Linux
open tools/icon-preview/index.html          # macOS
start tools/icon-preview/index.html         # Windows
```

Ou simplemente arrástrao a unha pestaña do navegador.

### Conjuntos predefinidos

- **Builtin**: os 6 iconos do `BUILTIN_ICONS` auto-rexistrados polo paquete.
- **Norse v1**: set de ~28 iconos con motivos nórdicos (yggdrasil, runas, animais místicos, armas, símbolos celestes...). Arte funcional, refinable.
- **Norse v2**: variante alternativa do mesmo set.

### Controis en vivo

- **Tamaño**: 16-128px.
- **Cor**: color picker (aplícase como `color` CSS; os paths usan `currentColor`).
- **Fondo do card**: claro / escuro / auto (segue prefers-color-scheme).
- **Stroke width**: cando hai paths con `mode: 'stroke'`.

### Custom paste

No `<details>` da parte inferior podes pegar código JS/TS coa estrutura:

```javascript
export const MY_ICONS = {
  'meu-icono': {
    paths: [{ d: 'M12 4v16', mode: 'stroke' }]
  },
  ...
}
```

O parser extrae a constante e renderiza todos os iconos. Útil para iterar artes nun **bucle moi rápido**: editas o path no editor de SVG (Inkscape, Figma, etc.), copias, pegas aquí, ves o resultado, e cando estás contento, copias ao `BUILTIN_ICONS` ou a un `registerIcons({ ... })` no código real.

## Conexión coa arquitectura

O formato `IconDef` desta ferramenta é **idéntico** ao do paquete:

```typescript
interface IconPath { d: string; mode?: 'fill' | 'stroke' }
interface IconDef { viewBox?: string; paths: readonly IconPath[] }
```

Polo tanto **calquera icono que vexas aquí pode pegarse directamente** ao código de produción sen tradución intermedia.

Ver tamén:
- `packages/react/src/icons/registry.ts` — API runtime do rexistro.
- `docs/architecture/MASTER.md` § A.6.21 — patrón do singleton.
