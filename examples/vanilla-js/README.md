# vanilla-js — a proba de agnosticismo / the agnosticism proof

**O core non sabe que React existe — proba: este ficheiro.** [`main.js`](main.js) usa só `@yggdrasil-forge/core` e o DOM: carga un documento da galería (`panadeiro.json`), pregunta `canUnlock`, chama `unlock` e pinta os estados. Cero React, cero framework, cero build especial — Vite só serve os módulos.

**The core doesn't know React exists — proof: this file.** [`main.js`](main.js) uses only `@yggdrasil-forge/core` and the DOM: it loads a gallery document (`panadeiro.json`), asks `canUnlock`, calls `unlock` and paints the states. Zero React, zero framework, zero special build — Vite just serves the modules.

```bash
pnpm --filter @yggdrasil-forge-examples/vanilla-js dev
```

O renderer SVG bonito é [`@yggdrasil-forge/react`](../../packages/react) — pero é **unha** opción, non a arquitectura. Se o teu stack é Vue, Svelte, Phaser ou un `<canvas>` a man, o motor e o formato son exactamente os mesmos: [o contrato estable](https://fraga-labs.github.io/yggdrasil-forge/contrato/contrato-estable/).

The pretty SVG renderer is [`@yggdrasil-forge/react`](../../packages/react) — but it is **one** option, not the architecture. If your stack is Vue, Svelte, Phaser or a hand-rolled `<canvas>`, the engine and the format are exactly the same: [the stable contract](https://fraga-labs.github.io/yggdrasil-forge/en/contrato/contrato-estable/).
