---
title: O ficheiro e o schema
description: O documento { tree, editor }, o JSON Schema publicado e como validalo.
sidebar:
  order: 2
---

## O documento: dous espazos de nomes

Un ficheiro `.json` do editor ten **dous** campos:

```json
{
  "tree":   { "id": "…", "schemaVersion": "1.0.0", "version": "1.0.0", "label": …, "nodes": […], "edges": […], "layout": { "type": "custom" } },
  "editor": { "formatVersion": "1.0.0", "coordinateBounds": { "minX": -60, "minY": -60, "maxX": 180, "maxY": 60 } }
}
```

- **`tree`** é o `TreeDef`: o contrato portable. É o único que o motor, o renderer ou calquera outro consumidor precisa. Podes usalo só (`new TreeEngine(doc.tree)`).
- **`editor`** é o que pertence ao **editor**, non ao dominio: o encadre do mundo (`coordinateBounds`), o **tema do documento** (`theme`: recheos por estado, cor de texto, rexións, preset), o **fondo** (`background`), miniatura e importacións. Se o perdes, a árbore segue sendo a mesma árbore.

Esta separación é unha decisión de arquitectura (MASTER A.6): o editor é unha ferramenta **sobre** dato, non contén dato.

## O JSON Schema publicado

O schema vive no repositorio e xérase a partir dos tipos reais (Zod) do motor e do editor, cun test de deriva que falla se diverxen:

**[`schema/yggdrasil-document.schema.json`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/blob/main/schema/yggdrasil-document.schema.json)**

Tamén o emite o CLI — útil para pipelines que non queren depender dunha URL:

```bash
npx ygg schema --out yggdrasil-document.schema.json
```

Úsao para: validar en calquera linguaxe (é JSON Schema draft-07), autocompletar en editores (`"$schema"`), e como **contexto para unha IA** xunto coa [galería](../../exemplos/galeria/).

> `layout.type` é unha cadea **aberta** a propósito: ademais dos motores incluídos (`radial`, `tree`, `layered`, `clustered-radial`, `constellation`, `custom`), un consumidor pode rexistrar os seus. O schema non o restrinxe.

## Validación: dúas capas

1. **Schema** (forma): campos, tipos, enumeracións. O que fai calquera validador de JSON Schema.
2. **Validadores duros** (semántica): ids únicos, referencias existentes (arestas, prerrequisitos, custos, exclusións), sub-árbores sen ciclos. Córrenos `ygg validate` e o editor ao importar: se pasan, **todo o documento é cargable**.

Por riba hai **validadores brandos** (avisos): exclusións asimétricas, ciclos de prerrequisitos, nodos fóra do encadre, efectos non soportados. Non bloquean; aparecen no panel *Problemas*.

```bash
npx ygg validate arbore.json           # lexible
npx ygg validate arbore.json --json    # { "ok": false, "issues": [ … ] } — erro como dato
npx ygg new --id demo --label "Demo"   # un documento baleiro válido para empezar
```

## Dous documentos mínimos

O máis pequeno útil está na galería: [`minimal.json`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/blob/main/examples/gallery/minimal.json) — dous nodos, un recurso, un prerrequisito, un custo por rango, etiquetas bilingües e encadre. E o de referencia «amable», o panadeiro, con grupos, rangos e tema.
