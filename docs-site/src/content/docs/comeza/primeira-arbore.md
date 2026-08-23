---
title: A túa primeira árbore en 5 minutos
description: Dúas vías ao mesmo resultado — co editor (sen código) ou co CLI (sen editor).
sidebar:
  order: 2
---

Imos facer unha árbore pequena de tres pasos: *Amasar → Cocer → Vender*. A mesma árbore sae polas dúas vías; escolle a túa.

## Vía A — co editor

1. Arranca o editor ([instalación](../instalacion/)) e fai **Ficheiro → Novo**.
2. Preme **N** (ferramenta *Engadir nodo*) e fai tres clics no canvas: tres nodos.
3. Selecciona cada un (ferramenta **V**) e, no **Inspector**, ponlles etiqueta: *Amasar*, *Cocer*, *Vender*. Ao de *Vender* ponlle **Tipo** `keystone` e **Icona** `logic-crown`.
4. Preme **C** (*Conectar*) e arrastra de *Amasar* a *Cocer*, e de *Cocer* a *Vender*. Coa opción por defecto, cada conexión engade o prerrequisito: *Cocer* require *Amasar*, etc.
5. Sen nada seleccionado, o Inspector mostra a **árbore**: engade un **Recurso** chamado *Punto* con inicial `3`. Volve a cada nodo e ponlle **Custo** `1 Punto`.
6. **Dispor → Árbore (por niveis)** para colocalos ben. Pestana **Tema → Pergamiño**.
7. Cambia a **Proba**: tes 3 puntos; desbloquea *Amasar*, logo *Cocer*, logo *Vender*. Os recheos van cambiando. **Reiniciar** volve ao principio.
8. **Ficheiro → Exportar JSON** garda o documento; **Exportar imaxe SVG** dáche a imaxe.

## Vía B — co CLI (sen abrir o editor)

Escribe `panaderia.json`:

```json
{
  "tree": {
    "id": "panaderia",
    "schemaVersion": "1.0.0",
    "version": "1.0.0",
    "label": { "gl": "Panadería", "en": "Bakery" },
    "resources": [{ "id": "punto", "label": { "gl": "Punto", "en": "Point" }, "initial": 3 }],
    "nodes": [
      { "id": "amasar", "type": "small", "label": { "gl": "Amasar" },
        "costPerTier": [[{ "resourceId": "punto", "amount": 1 }]] },
      { "id": "cocer", "type": "small", "label": { "gl": "Cocer" },
        "prerequisites": { "type": "all", "conditions": [{ "type": "node_unlocked", "nodeId": "amasar" }] },
        "costPerTier": [[{ "resourceId": "punto", "amount": 1 }]] },
      { "id": "vender", "type": "keystone", "label": { "gl": "Vender" }, "icon": "logic-crown",
        "prerequisites": { "type": "all", "conditions": [{ "type": "node_unlocked", "nodeId": "cocer" }] },
        "costPerTier": [[{ "resourceId": "punto", "amount": 1 }]] }
    ],
    "edges": [
      { "id": "e1", "source": "amasar", "target": "cocer", "type": "dependency" },
      { "id": "e2", "source": "cocer", "target": "vender", "type": "dependency" }
    ],
    "layout": { "type": "custom" }
  },
  "editor": { "formatVersion": "1.0.0" }
}
```

Fíxate: **sen posicións**. Non fan falta:

```bash
npx ygg validate panaderia.json            # ✓ documento válido (3 nodos, 2 arestas)
npx ygg layout panaderia.json --algo tree --out panaderia.json
npx ygg render panaderia.json --out panaderia.svg
```

`layout` coce as posicións (e o encadre) no documento; `render` produce un SVG autocontido. Importa `panaderia.json` no editor cando queiras retocalo.

## O que acabas de usar

- O **documento** `{ tree, editor }`: o `tree` é o contrato portable (o motor só sabe diso); `editor` garda o que é do editor (encadre, tema, fondo). → [O contrato TreeDef](../../contrato/conceptos/)
- **Prerrequisitos** e **custos por rango**: a lóxica de progresión vive no dato, non na UI.
- **Dispor / `ygg layout`** e **preset / iconas**: posición e aspecto por declaración. → [Layouts](../../layouts/), [Theming](../../theming/)
- **Proba**: o motor xogando a túa árbore.

Seguinte: [o bucle con IA](../bucle-ia/) — a mesma vía B, pero quen escribe o JSON é un modelo.
