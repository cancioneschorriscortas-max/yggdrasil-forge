---
title: Conceptos
description: Nodos, arestas, recursos, prerrequisitos, exclusións, rangos e efectos — o vocabulario dunha árbore de progresión.
sidebar:
  order: 1
---

Unha árbore de Yggdrasil Forge é un **`TreeDef`**: un grafo dirixido de **nodos** unidos por **arestas**, cunha economía de **recursos** e regras de **desbloqueo**. O motor (`@yggdrasil-forge/core`) só entende este dato; o editor, o renderer e o CLI traballan sobre el. *Same data, different themes.*

## Nodos

Un nodo é algo que se pode **desbloquear**: unha habilidade, unha lección, unha tecnoloxía.

| Campo | Que é |
|---|---|
| `id` | Identificador estable e único (`pan_básico`). As referencias (arestas, prerrequisitos, efectos) apuntan por id. |
| `type` | Semántica e forma por defecto: `small`, `notable`, `keystone`, `mastery`, `ascendancy`, `root`, `cluster`, `gateway`, `milestone`, `subtree_anchor`, `custom`. |
| `label`, `description` | Textos localizables (`"Pan"` ou `{ "gl": "Pan", "en": "Bread" }`). |
| `position` | `{ x, y }` no mundo. Opcional: `ygg layout` ou *Dispor* póñena. |
| `color`, `icon`, `shape`, `size`, `iconScale` | Aparencia. `icon` acepta un emoji, unha URL de imaxe ou un id de icona rexistrada (`logic-key`, `norse-wolf`). |
| `maxTier` | Cantos **rangos** ten (por defecto 1). Un nodo de 3 rangos desbloquéase por etapas. |
| `cost`, `costPerTier` | O que custa desbloquear: lista de `{ resourceId, amount }`, ou unha lista por rango. |
| `prerequisites` | A regra de desbloqueo (abaixo). |
| `exclusions` | Ids de nodos mutuamente excluíntes (*escoller A pecha B*). |
| `effects` | O que pasa ao desbloquear (abaixo). |
| `tags`, `group` | Etiquetas (tintes de rexión, condicións `tag_count`) e pertenza a un grupo. |

## Arestas

Unha aresta `{ id, source, target, type }` **debuxa** unha relación. O tipo `dependency` é a semántica principal: *A → B* significa «B depende de A». Outros tipos: `soft_dependency` (recomendación), `exclusion`, `enhancement`, `path`, `cluster`, `subtree_link`. As arestas son a topoloxía que ven os layouts; **a regra de desbloqueo real vive en `prerequisites`** (o editor, ao conectar, engade as dúas cousas á vez).

## Prerrequisitos

Unha `UnlockRule` é un **combinador** (`all`, `any`, `none`) sobre unha lista plana de **condicións**:

```json
"prerequisites": {
  "type": "all",
  "conditions": [
    { "type": "node_unlocked", "nodeId": "fariña" },
    { "type": "resource_min", "resourceId": "moedas", "amount": 5 }
  ]
}
```

Condicións dispoñibles: `node_unlocked`, `node_maxed`, `node_state`, `tier_min`, `resource_min`, `tag_count`, `nodes_count`, `distance_max`, `progress_min`, `stat_min`, `subtree_completion`, `time_after`, `time_before`. Un ciclo (*A require B que require A*) non bloquea o gardado, pero o editor avísao e os layouts por capas o rexeitan.

## Recursos e economía

```json
"resources": [{ "id": "punto", "label": { "gl": "Punto" }, "initial": 3, "max": 10 }]
```

Os recursos gástanse cos custos e poden recuperarse (`refundable`, `refundPercent`). `initial` semente o orzamento da sesión de Proba. Un custo que referencia un recurso inexistente é un aviso do editor.

## Rangos (tiers)

Con `maxTier > 1`, cada desbloqueo sobe un rango. `costPerTier` é unha lista **densa** (un custo por rango: `[[…rango1], […rango2]]`). Visualmente, un nodo a medias píntase como *en progreso*.

## Efectos

Ao desbloquear, un nodo pode disparar efectos: `modify_resource`, `modify_node_state`, `set_node_visibility`, `unlock_node`, `set_progress`, `trigger_event`, e os compostos `composite` / `conditional`. O editor só propón os que o runtime sabe aplicar.

## Grupos e sub-árbores

Os **grupos** (`groups`) agrupan nodos por `nodeIds` ou por `node.group`; os layouts *Radial por grupos* e a vista de **tarxetas** constrúense sobre eles. As **sub-árbores** (`subtrees`) aniñan un `TreeDef` dentro doutro (currículos).

## Estados dun nodo

O motor calcula en cada momento: `locked`, `unlockable`, `unlocked`, `maxed`, `in_progress` (e `hidden`, `disabled`, `expired`). O tema pinta un recheo por estado — por iso os presets teñen cinco cores.

Seguinte: [o ficheiro e o schema](../ficheiro-e-schema/).
