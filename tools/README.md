# tools/

Ferramentas standalone de **desarrollo e edición** para o proxecto Yggdrasil Forge.

Esta carpeta é distinta de `examples/` (que contén paquetes pnpm con código consumidor demostrativo) e de `docs/` (documentación de lectura). Aquí van **utilidades activas que usa o equipo de desarrollo** durante a iteración do proxecto: previsualizadores, editores experimentais, generadores de fixtures, ferramentas de inspección, etc.

Características comúns das ferramentas en `tools/`:

- **Standalone**: cada subdirectorio é autocontido (pode ser un `index.html` aberto directamente nun navegador, un script Node, ou unha pequena app). **Sen** dependencias de pnpm install se se pode evitar.
- **Sen impacto en builds nin publicacións**: os contidos de `tools/` **non se incluen en ningún paquete publicado en npm**. É código de "andamio" para o equipo.
- **Cero ataduras de versionado**: pódense modificar libremente sen pasar por changesets nin polas regras de release.

## Ferramentas actuais

| Carpeta | Descrición |
|---|---|
| [`icon-preview/`](./icon-preview/) | Previsualizador SVG de iconos en formato `IconDef` (F10.5). Útil tamén como base para un futuro panel "Import icons" no Studio editor. |

## Engadir unha nova ferramenta

1. Crea un subdirectorio descriptivo: `tools/<nome-tool>/`.
2. Engade un `README.md` curto explicando para que é e como usala.
3. Se a ferramenta require build/install, documéntao no seu README. **Idealmente** non se require nada — un `index.html` que abre directamente é o estándar dourado.
4. Non engadas `tools/<algo>` a ningún `workspaces` de pnpm a non ser que sexa necesario.
