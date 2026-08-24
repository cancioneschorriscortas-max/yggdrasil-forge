---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat: selector visual de iconas no campo Icona (nodo e recurso)

O banco de 7.19 cobra: novo `IconWidget` compartido — texto libre de
sempre (emojis, URLs, ids á man: cero regresión) + preview en vivo +
popover con busca instantánea, grella agrupada por set (Builtin /
Norse / Lóxica / Outras), «Sen icona», teclado completo (frechas pola
grella, Enter, Esc devolve o foco, Tab atrapado) e peche por clic
fóra. `PropertyType` gaña `kind: 'icon'` (o dato segue sendo texto; a
UI resolve o selector). Axe en verde co popover aberto.
