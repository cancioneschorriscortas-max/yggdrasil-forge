---
"@yggdrasil-forge/react": minor
---

feat(react): `node.icon` admite rutas/recursos de imaxe locais (F11.3). A detección `iconIsUrl` no `SkillNode` amplíase para que rutas absolutas (`/badges/x.webp`), relativas (`./a.png`, `../b.avif`), `data:` URIs e calquera cadea que remate en extensión de imaxe (`webp`/`avif`/`png`/`jpg`/`jpeg`/`gif`/`svg`) se renderice como `<image>` SVG en vez de caer ao fallback `<text>`. Os ids de glyph rexistrados seguen resolvéndose como `IconGlyph` (regresión cero). Os `http(s)://`/`//` seguen funcionando como antes.
