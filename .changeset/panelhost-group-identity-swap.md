---
'@yggdrasil-forge/editor-react': minor
---

fix(editor): `PanelHost` conserva identidade e tamaño real do grupo ao alternar Autoría↔Proba (7.7c)

A reconciliación de paneis (engadir-antes-de-quitar, briefing 7.7) buscaba
un panel vivo da mesma banda (`defaultLocation`) só dentro do conxunto
NOVO de `panels`, que xa non inclúe os paneis que están a desaparecer
(p.ex. `inspector`/`tema` ao entrar en Proba). Iso facía que nunca
atopase un candidato, caese sempre ao *fallback* de posicionamento, e
creara un **grupo dockview novo** en cada swap de modo en vez de
reutilizar o existente — perdendo o axuste manual de tamaño do usuario
e provocando recálculos erráticos das proporcións veciñas (o grupo
esquerdo tamén se via afectado).

Arranxo: a reconciliación agora busca sobre a **unión** dos `PanelDef`
anteriores e novos, así atopa o panel vivo da banda aínda que xa non
estea no conxunto novo. Ademais, captura o `width`/`height` real de
cada grupo vivo (por `group.id`, estable mentres o grupo non queda
baleiro) antes de engadir/quitar, e reaplícao despois — belt-and-suspenders
sobre a identidade xa corrixida.

Sen cambios de API pública.
