---
title: About the API reference
description: How the API reference is generated, and why it comes in a single language.
---

The API section is **generated automatically from the TSDoc in the source code** on every build of this documentation (typedoc; the same anti-drift pattern as the gallery: nothing hand-written, nothing committed — if generation fails, the site build fails). It covers the public packages: `common`, `core`, `react`, `editor-core` and `cli`.

**Language note**: unlike the rest of this site (strictly bilingual), the generated reference comes in **a single language — the language of the source TSDoc**, mostly Galician. Translating generated documentation is unmaintainable: the translated copy would drift from the code within a week. We prefer one always-exact reference over two half-true ones.

For a guided introduction, start with [concepts](../contrato/conceptos/) and [the file and the schema](../contrato/ficheiro-e-schema/); the reference is for when you already know what you are looking for.
