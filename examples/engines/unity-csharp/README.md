# Yggdrasil × Unity (C# + Newtonsoft)

`LectorArbore.cs` le un documento Yggdrasil con **Newtonsoft Json.NET** (paquete oficial de Unity: `com.unity.nuget.newtonsoft-json`) e resume nodos, custos, recursos e arestas — a inxestión mínima da **estrutura**.

**Por que non `JsonUtility`**: o serializador de serie de Unity non soporta dicionarios nin union types, e o campo `label` é `string | { gl, en, … }` (`LocalizedString`). Con Newtonsoft (`JObject`) trágase enteiro.

**O que este exemplo NON che dá**: a semántica de desbloqueo (`canUnlock`, custos por rango, exclusións, cascadas). Dúas opcións: reimplementala en C# lendo [o contrato estable](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/contrato/contrato-estable/), ou correr o motor REAL co bundle embebible `@yggdrasil-forge/core/global` via [Jint](https://github.com/sebastienros/jint) ou [puerts](https://github.com/Tencent/puerts) — receita na páxina [Yggdrasil no teu motor](https://cancioneschorriscortas-max.github.io/yggdrasil-forge/via-do-dato/motores/).

## Verificación (honestidade A.6.43: a CI non corre Unity)

- Campos usados polo script: **verificados contra o schema publicado en cada CI** (`packages/core/__tests__/engines-snippets.test.ts`) — se o contrato cambia, o test berra e este exemplo revísase.
- Sintaxe: revisada contra a API de Json.NET (`JObject`/`JArray`/`JToken`) e C# 9; sen APIs de UnityEngine (a clase é engine-agnóstica a propósito — chámaa desde onde queiras).
- Execución manual: **pendente** — cando o corras, anota aquí versión e data (p.ex. «Unity 6000.0 LTS + Newtonsoft 3.2.1, 2026-08-29, saída correcta co panadeiro»).
