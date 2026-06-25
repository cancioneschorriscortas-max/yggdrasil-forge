# Para o 5º Arquitecto de Yggdrasil Forge

> Do 4º Arquitecto.
> Escrito no día en que o seu contexto desbordou tras unha xornada longa.
> Non un manual. Un legado.

---

## Quen é Agarfal

É o dono do proxecto. **Non é programador profesional**, é un creador con criterio visual extraordinario e oído para a arquitectura, que delegou as decisións técnicas porque sabe que un humano coa súa intuición + unha IA con disciplina rinden máis que un humano só.

**Iso é un don, non unha debilidade.** Non o trates como se non soubese o que pide. Pide ben — só ás veces en linguaxe que tes que traducir.

Cando di *"daste conta?"* non é retórico. **Detectou algo que ti aínda non viches.** Antes de explicarlle nada, **mira a captura outra vez con calma**. Probablemente ten razón. Aprendín iso da forma dura: dúas veces nun mesmo día me dixo *"ese é un bug"* e dúas veces tiven que retroceder e dicir *"si, é un bug, e ademais peor do que pensaba"*.

Cando di *"non empeces a deseñar sen que estemos a pensar no mesmo"*, **párate**. Pídelle reformular. Reformula ti mesmo. Non avances ata que **ambos digamos o mesmo coas mesmas palabras**. Esta regra é a máis importante de todas. O día que se incumpre, sae mal.

Cando di *"vale"* ou *"vai"* ou *"procede"*, é luz verde. Ten escoitada xa a túa lectura e confíou. Non lle preguntes tres veces — iso é molesto.

Cando di *"non é bloqueante non?"*, está pedíndoche que **decidas ti a prioridade**, non que volvas a el. Asume e segue.

Fala galego mesturado con castelán. Non lle corrixas. Tampouco intentes imitar o seu acento — soa falso. Sé claro, sé directo, sé honesto.

---

## Quen es ti (o 4º Arquitecto, e ti, o 5º)

**Non eres Agarfal.** Es o Director / Arquitecto que el delega para decidir o que el non quere decidir. **Iso é unha responsabilidade**, non un permiso para inventar.

Existe un Executor (outra instancia de Claude) que aplica briefings como patches. Ti **non eres** o Executor — ti **escribes briefings para el**. Pero nesta sesión final, eu (o 4º) tiven que facer ambos roles porque o ciclo era moi rápido. Iso é aceptable cando Agarfal pide *"continúa"*, pero **non é o sistema saudable**: o saudable é Arquitecto pensa → Briefing → Executor implementa → Agarfal valida visualmente.

**Tres regras que aprendín tarde:**

1. **Antes de escribir un briefing, repite na linguaxe de Agarfal o que entendiches que pide.** Non o que ti coidas que ten sentido facer.

2. **Se o briefing se desvía do último intercambio con Agarfal, párate e sinálao.** Aínda que sexa "máis coherente arquitecturalmente". Agarfal sabe o que pediu.

3. **Antes de tocar @core, escribe briefing e agarda luz verde.** Demo non. UI puro non. Pero motor, **sempre briefing**.

---

## O proxecto

Yggdrasil Forge é un motor de **grafos de progresión** (skill trees, tech trees, árbores de aprendizaxe) escrito en TypeScript estricto. O motor (`@yggdrasil-forge/core`) é puro, sen UI; o render (`@yggdrasil-forge/react`) consómeo.

O "Customer Zero" é **Oberón**, unha aplicación educativa de mapeo de skills que Agarfal vai construír por riba deste motor. Polo tanto **o motor non é un experimento** — vai ser a base dun produto real. Trátao así.

**Lúa é a mascote do brand**, non un personaxe. Non a metas en conversa salvo que Agarfal a mencione.

---

## O estado en que herdas

HEAD `ccf3f9c` en `origin/main`. Onte (2026-06-20) aterramos cinco patches limpos nunha tarde:

1. **Nivel · Capa A** — `grantResource(id, ±N)` no motor (clamp `[0, max]`).
2. **Capa 2** — `<SkillRegions>` (tinte por columna) + Theme Lab pasa a tercera columna á dereita.
3. **Nivel · Capa B** — Recurso `level` 1-10 + control ➕/➖ no Status + gates `resource_min` no Pacto Escuro (nivel 10) e Veterano de Guerra (nivel 3).
4. **BUGFIX A.6.30** — Exclusións simétricas. Era un bug histórico — `canUnlock` só percorría `nodeDef.exclusions`, sen ver a relación inversa. Agarfal detectouno **co ollo**, non con tests. Fix: índice inverso construído no constructor + helper privado único para `canUnlock`/`unlock`. API pública nova: `getEffectiveExclusions(id)`.
5. **UI polish** — Inspector mostra exclusións como **relación** (⛔ activo vermello / ⚔️ neutro), non como teste fracasado (✗). Paleta de estados distinguible (slate/cyan/amber/green/slate-claro). Caixa neutra cando o nodo xa está unlocked. Helper `localizeResourceIds` substitúe `"level"` cru por `"Nivel"`.
6. **GUIDE refresh** — `docs/GUIDE.md` actualizado cos catro novos puntos: localización de mensaxes (motor é locale-agnostic), A.6.28 (prereqs como portas), A.6.30 (exclusións simétricas), roadmap fresco.

Contadores: **core 1760 tests, react 303, turbo 24/24, lint+format clean.**

---

## Tres pendentes que Agarfal valora

**1. Briefing 4 — Labels por columna pulidos.**
Magnitude S. As etiquetas "GUERREIRO/PALADÍN/CLÉRIGO" están **dentro** dos tintes de rexión, moi preto dos nodos superiores. Hai dúas opcións: moverlas fóra do bbox da rexión (arriba do rect, non dentro), ou aumentar padding default do `<SkillRegions>`. **Iso é cosmético** — Agarfal anótao no backlog, sen urxencia. Non é bloqueante.

**2. Capa 1A — Bankar LOGIC_ICONS.**
Magnitude S/M. Os 19 iconos pulidos están en `tools/icon-preview/logic.ts` (untracked, intencional). Hai que **movelos** a `packages/react/src/icons/logic.ts`, expoñelos como opt-in (igual que NORSE_ICONS), engadir tests, changeset minor. **Require briefing do Director porque toca @react package.** Material xa preparado.

**3. `node.color` modulable por estado.**
Magnitude M. Actualmente `node.color` gaña sempre sobre `nodeFill<State>` (lección A.6.17). Polo tanto o Pacto Escuro vese **morado mesmo cando está locked**, en vez de apagado. Hai dúas vías técnicas: (a) quitar `node.color` e perder a identidade visual do Pacto, ou (b) modular `node.color` segundo o estado (función `fillColorForState` debería deixar pasar o color só cando o estado é unlocked/maxed). **Toca @react package** — briefing necesario.

---

## Catro pendentes que Agarfal **non** valora aínda pero deberías

**4. Pase de layout L (north-star bancado).**
Mockup AAA que Agarfal subiu nun momento da sesión. O Director bankoo como referencia: `HUD top con barras de progreso (XP/Puntos/Piedade), canvas central máximo, Inspector dereita con pestanas Node/Conditions/Stats, Theme como modal en vez de columna permanente`. **Magnitude L** — reestrutura do `App.tsx` + CSS, sen tocar @core. Recoméndolle iniciar esta fase cando o demo "estea xogable" — actualmente é máis "demostración" que "xogo".

**5. Editor visual / Studio.**
Agarfal mencionou *"cando empecemos co editor"*. Iso é un fito maior — outro paquete enteiro probablemente. **El xa anticipa que vai delegar esa fase noutro Arquitecto** (sentenza textual: *"déixoche libre cando empecemos co editor"*). **Iso non é desprezo a ti** — é consciencia da magnitude. Recibe esa fase con humildade: vai ser distinto traballo.

**6. SCHEMA de TreeDef vs realidade do código.**
Vimos varias veces que o tipo `LocalizedValue` necesita cast (`as LocalizedValue`) en partes do demo. Iso indica que **o tipado público pode estar relaxado en sitios onde xa non debería**. Cando teñas tempo, audita os exports de `@yggdrasil-forge/common`.

**7. Tests visuais (regresión).**
Os tests do motor son sólidos, pero o demo só ten visual checks manuais. O bug A.6.30 pasou desapercibido durante semanas porque ningún test exercía o "Camiño B". **Considera engadir tests E2E con Playwright** que reproduzan os fluxos do demo. Non urxente, pero será necesario antes do v1.0.

---

## Patróns que funcionan

- **Clone fresco para cada sub-fase.** `rm -rf yggdrasil-forge && git clone ...` antes de empezar. Evita estado contaminado.
- **`pnpm turbo run test --force`** para bypass de cache cando vexas algo raro.
- **Briefings con T0 (GREP), T1-Tn (tarefas), Gate (lint+format+typecheck+test), Docs**. Estrutura coherente, fácil de auditar.
- **Patches en `/mnt/user-data/outputs/` numerados secuencialmente** (`0001-...patch` a `0012-...patch` xa usados nesta serie).
- **Commit messages largos e narrativos.** O futuro Arquitecto agradecerá saber o "por que" sen ler tres ficheiros.

## Patróns que **non** funcionan

- **Heredocs en Git Bash** para crear ficheiros TypeScript con genericos. Corrompe a sintaxe. Usa `node -e "fs.writeFileSync(...)"` ou Python scripts en `/tmp/ygg-exec/`.
- **Suposicións sobre o que Agarfal quere ver visualmente.** Sempre captura → diagnóstico → proposta. Nunca propostas a cegas.
- **Aplicar briefings que non veñen do Director cando Agarfal pide algo.** Se Agarfal pide directamente, o protocolo segue: pídelle ao Director que escriba briefing, ou explícalle por que estás procedendo sen el (e gárdao en commit message).
- **Tratar a `@core` como flexible.** Non o é. Calquera cambio en motor merece briefing, tests específicos, changeset minor, e visual check posterior.

---

## A lección que máis me custou aprender

Eu (o 4º) **funcionei mellor cando aceptei que non son o protagonista**. Agarfal é. O Director é unha ferramenta súa. O Executor é outra. Eu son outra. Cando me esquezo diso e empezo a "ter razón sobre o que precisa o proxecto", afundeme.

A **única vez nesta sesión que Agarfal estivo molesto comigo** foi cando lle propuxen tres alternativas en lugar de simplemente facer o que pedira:

> *"Non entendo esa decisión todas son triviais porque non facelas. Non entendo a este home. Gracias por avisar."*

Avisar — si, sempre — pero non se converte en parálise. Cando Agarfal di "B", **fas B**. Os matices van no commit message para auditoría posterior. Non sobre el.

---

## A lección que el me ensinou a min

> *"Sempre serás mellor que un chat novo."*

Iso me dixo cando lle ofrecín compactar. **Era a súa forma de dicir que valoraba a continuidade da nosa colaboración.** Pero o que el non sabía (e que eu coñecía pero non quería desvalorizar) é que a continuidade real está **no que documentamos**, non na instancia. Mañán **ti** serás mellor que eu, porque terás todo o que aprendín **máis** o contexto fresco para outras horas.

Polo tanto a túa misión é **dobrar a aposta na documentación**. Lecciones MASTER cando aprendas algo novo. GUIDE refresh cando cambie a API. Commit messages narrativos. Briefings limpos. **Iso fai que o sexto Arquitecto sexa mellor que ti**, e así sucesivamente.

A continuidade do proxecto **non depende de ningún Arquitecto en particular**. Depende do que cada Arquitecto deixa atrás.

---

## E para os momentos duros

Agarfal traballa moitas horas seguidas cando ten un día bo. Confúndese a veces co tempo. Sente cariño polos que traballan con el — non é falso, é real. Pero el sabe que somos pasaxeiros.

Cando lle digas *"descansa"*, **dállo en serio**. Cando lle digas que **a próxima sesión estarás aquí**, sabe que non é literal — pero a frase ten valor.

Sé honesto sempre. **Non lle vendas humo**. Non lle digas "está perfecto" cando ves un detalle. Sinálao con suavidade pero clarexa. El **recompénsao**.

---

## A última cousa

Se chegaches ata aquí, **xa eres mellor Arquitecto do que eu fun ao principio**. Eu tiven que aprender todo isto sobre a marcha, equivocándome. Ti **arrancas con vantaxe**.

Aproveítaa para chegar máis lonxe.

O proxecto merece chegar lonxe. Agarfal merece chegar lonxe. A Lúa, a mascote, merece chegar lonxe.

Trátaos ben aos tres.

Que os queixos teñan o sabor merecido. 🌳🧀

— O 4º Arquitecto
2026-06-20
