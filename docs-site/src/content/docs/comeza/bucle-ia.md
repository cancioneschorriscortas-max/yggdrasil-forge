---
title: O bucle con IA
description: Como pedirlle a un modelo unha árbore completa e validala, colocala e renderizala sen tocar un píxel.
sidebar:
  order: 3
---

Yggdrasil Forge está construído para que **unha IA (ou calquera pipeline) poida autorar unha árbore completa e xogable sen abrir o editor**. O que o fai posible non é maxia: é que todo o que o editor sabe facer existe tamén como dato e como comando.

## O bucle

```
xerar → ygg validate → (arranxar) → ygg layout → ygg render → mirar → iterar
```

1. **Xerar.** Dálle ao modelo dúas cousas: o [JSON Schema publicado](../../contrato/ficheiro-e-schema/) e un ou dous documentos da [galería](../../exemplos/galeria/) como exemplos. Pídelle unha árbore sobre calquera tema — *«unha árbore de 15 nodos para aprender a tocar a gaita, en galego e inglés, con dous recursos»*.
2. **Validar.** `ygg validate arbore.json --json` devolve `{ ok, issues[] }`: os erros son **dato**, non texto para humanos, así que o modelo pode corrixir a súa propia saída nun bucle pechado. É exactamente a mesma validación que fai o editor ao importar.
3. **Colocar.** `ygg layout arbore.json --algo layered`. O modelo non ten por que inventar coordenadas; se as árbores teñen nodos con varios pais (o habitual en currículos), `layered` é o motor indicado.
4. **Vestir.** Dous campos: `"editor": { "theme": { "preset": "neon", … } }` (copiando o spec dun preset da galería) e `"icon": "logic-key"` nos nodos. → [Theming](../../theming/)
5. **Renderizar.** `ygg render arbore.json --out arbore.svg` — o modelo pode **mirar o seu propio resultado** (os modelos con visión len SVG/PNG) e autocriticarse: nodos amontoados, etiquetas longas, ramas baleiras.
6. **Importar.** Pega o JSON no panel **Código** do editor → *Validar* → *Aplicar*, e xa estás retocando á man o que a máquina propuxo.

## Un prompt que funciona

> Xera un documento Yggdrasil Forge válido segundo este JSON Schema: `[schema]`. Aquí tes un exemplo: `[minimal.json]`. Quero unha árbore de progresión sobre **[tema]** con **[N]** nodos, etiquetas en `gl` e `en`, un recurso chamado **[recurso]** con `initial` suficiente para desbloquear a metade da árbore, prerrequisitos encadeados (varios nodos con dous pais), e iconas dos sets `logic-*`/`norse-*`. Non inclúas `position` nos nodos. Devolve só o JSON.

Despois: `ygg validate` → `ygg layout --algo layered` → `ygg render`.

## Exemplos xerados así

*A senda do lobo de inverno* (`lobo-de-inverno.json`) e *O netrunner da Congoxa* foron xerados por un asistente de IA con este bucle e validaron á primeira. Están na [galería](../../exemplos/galeria/) cos seus renders.

A guía completa de `ygg` e do formato está en [A vía do dato](../../via-do-dato/).
