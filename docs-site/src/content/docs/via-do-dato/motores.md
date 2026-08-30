---
title: Yggdrasil no teu motor
description: Como consumir un documento Yggdrasil en Godot, Unity e Unreal — e como facer que a semántica viaxe co bundle embebible.
sidebar:
  order: 2
---

**O relato enteiro nunha liña**: as regras viaxan no JSON; co bundle embebible, quen as avalía tamén. *O mesmo documento toma as mesmas decisións no editor, en Godot, en Unity e en Unreal.*

E a honestidade como estrutura: **lelo é trivial** (é JSON cun [schema publicado](../../contrato/ficheiro-e-schema/)); **a semántica non vén gratis** — ou a reimplementas ti (lendo [o contrato estable](../../contrato/contrato-estable/)), ou embebes o motor real (abaixo). Non hai terceira opción máxica, e ningún outro formato cha dá tampouco: non existe ningún estándar de skill trees que os motores importen de serie.

## Ler a estrutura (a parte trivial)

### Godot

`JSON.parse_string` é nativo de GDScript — cero dependencias. Exemplo completo (~40 liñas): [`examples/engines/godot-gdscript`](https://github.com/fraga-labs/yggdrasil-forge/tree/main/examples/engines/godot-gdscript).

```gdscript
var doc: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://arbore.json"))
for nodo: Dictionary in doc["tree"]["nodes"]:
    print(nodo["id"], " custo r1: ", nodo.get("costPerTier", [[]])[0])
```

### Unity

Con **Newtonsoft Json.NET** (paquete oficial: `com.unity.nuget.newtonsoft-json`). O `JsonUtility` de serie **non chega**: non soporta dicionarios nin union types, e `label` é `string | { gl, en, … }`. Exemplo completo: [`examples/engines/unity-csharp`](https://github.com/fraga-labs/yggdrasil-forge/tree/main/examples/engines/unity-csharp).

```csharp
var doc = JObject.Parse(File.ReadAllText(ruta));
foreach (var nodo in (JArray)doc["tree"]["nodes"])
    Debug.Log($"{nodo["id"]} custo r1: {nodo["costPerTier"]?[0]}");
```

### Unreal

`FJsonObject` (módulo `Json`) le calquera JSON en C++. Nota honesta: os **DataTables non** tragan o documento — só aceptan filas planas uniformes, e isto pásalle a calquera formato rico, non só ao noso. Lélo con `FJsonSerializer::Deserialize` e percorrer `TSharedPtr<FJsonObject>` funciona sen sorpresas.

**Sentinela na CI**: os camiños de campos que usan estes exemplos verifícanse contra o schema publicado en cada CI (`engines-snippets.test.ts`) — se o contrato cambia, os snippets revísanse. O que a CI **non** fai é correr Godot/Unity/Unreal: o estado de verificación manual de cada exemplo vai no seu README, sen cobertura finxida.

## Que a semántica viaxe (a parte singular)

Reimplementar `canUnlock` no teu motor é posible — e é onde nacen as derivas. A alternativa: **correr o motor real**. O paquete `@yggdrasil-forge/core` distribúe desde o 17.7 un **bundle embebible**:

```
@yggdrasil-forge/core/global  →  dist/yggdrasil-core.global.js
```

IIFE autocontido (global `YggdrasilCore`, `immer`+`zod` dentro, **cero DOM, cero imports, cero Node**) pensado para os intérpretes JS que se embeben nos motores. E non é promesa: **hai un test de fume en cada CI que executa o bundle en QuickJS real** — carga o bundle, constrúe o `TreeEngine` coa árbore da galería e comproba con valores concretos que `canUnlock`/`unlock`/`getBudget` deciden igual ca no editor. Se o core deixase de correr en JS-sen-DOM, a porta cae.

### Jint (.NET / Unity)

[Jint](https://github.com/sebastienros/jint) interpreta JS en .NET puro (sen procesos externos; úsano RavenDB ou Orchard):

```csharp
var motor = new Jint.Engine();
motor.Execute(File.ReadAllText("yggdrasil-core.global.js"));
motor.Execute($"var engine = new YggdrasilCore.TreeEngine(({docJson}).tree, {{ locale: 'gl' }})");
var pode = motor.Evaluate("JSON.stringify(engine.canUnlock('masa_dulce'))").AsString();
```

### puerts (Unreal e Unity)

[puerts](https://github.com/Tencent/puerts) (Tencent) embebe V8/QuickJS/Node en Unreal e Unity con bindings TS. Carga o bundle como calquera script global e fala con `YggdrasilCore` desde C++/C#/TS.

### GodotJS (Godot 4)

[GodotJS](https://github.com/godotjs/GodotJS) engade V8/QuickJS a Godot 4. O bundle cárgase como script global e `YggdrasilCore.TreeEngine` queda dispoñible desde os teus scripts.

**Honestidade de verificación, tamén aquí**: o que a CI garante é que o bundle corre en QuickJS — o mesmo intérprete que usan puerts e GodotJS como backend lixeiro. As integracións concretas con cada motor non se verifican na nosa CI; se montas unha, [cóntanolo](https://github.com/fraga-labs/yggdrasil-forge/issues).

## Que NON hai (bancado con nome)

Sen port nativo a C#/GDScript (dobre mantemento e deriva asegurada — só se hai demanda real), sen `ygg export --flat`, sen plugin «oficial» de Godot/Unity polo momento. O roadmap §6 garda o sitio.
