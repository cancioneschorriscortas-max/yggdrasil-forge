---
title: Yggdrasil in your engine
description: How to consume an Yggdrasil document in Godot, Unity and Unreal — and how to make the semantics travel with the embeddable bundle.
sidebar:
  order: 2
---

**The whole story in one line**: the rules travel in the JSON; with the embeddable bundle, so does what evaluates them. *The same document makes the same decisions in the editor, in Godot, in Unity and in Unreal.*

And honesty as the structure: **reading it is trivial** (it is JSON with a [published schema](../../contrato/ficheiro-e-schema/)); **the semantics don't come for free** — either you reimplement them (reading [the stable contract](../../contrato/contrato-estable/)) or you embed the real engine (below). There is no magic third option, and no other format gives you one either: no skill-tree standard exists that engines import out of the box.

## Reading the structure (the trivial part)

### Godot

`JSON.parse_string` is native GDScript — zero dependencies. Complete example (~40 lines): [`examples/engines/godot-gdscript`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/tree/main/examples/engines/godot-gdscript).

```gdscript
var doc: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://arbore.json"))
for nodo: Dictionary in doc["tree"]["nodes"]:
    print(nodo["id"], " tier-1 cost: ", nodo.get("costPerTier", [[]])[0])
```

### Unity

With **Newtonsoft Json.NET** (official package: `com.unity.nuget.newtonsoft-json`). The built-in `JsonUtility` **is not enough**: it supports neither dictionaries nor union types, and `label` is `string | { gl, en, … }`. Complete example: [`examples/engines/unity-csharp`](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/tree/main/examples/engines/unity-csharp).

```csharp
var doc = JObject.Parse(File.ReadAllText(path));
foreach (var node in (JArray)doc["tree"]["nodes"])
    Debug.Log($"{node["id"]} tier-1 cost: {node["costPerTier"]?[0]}");
```

### Unreal

`FJsonObject` (the `Json` module) reads any JSON in C++. Honest note: **DataTables won't** swallow the document — they only accept flat uniform rows, and that happens to any rich format, not just ours. Reading with `FJsonSerializer::Deserialize` and walking `TSharedPtr<FJsonObject>` works without surprises.

**CI sentinel**: the field paths these examples use are verified against the published schema on every CI run (`engines-snippets.test.ts`) — if the contract changes, the snippets get reviewed. What CI does **not** do is run Godot/Unity/Unreal: each example's manual verification status lives in its README, with zero fake coverage.

## Making the semantics travel (the singular part)

Reimplementing `canUnlock` in your engine is possible — and it is where drift is born. The alternative: **run the real engine**. Since 17.7, `@yggdrasil-forge/core` ships an **embeddable bundle**:

```
@yggdrasil-forge/core/global  →  dist/yggdrasil-core.global.js
```

A self-contained IIFE (global `YggdrasilCore`, `immer`+`zod` inside, **zero DOM, zero imports, zero Node**) meant for the JS interpreters that embed into engines. And it is not a promise: **a smoke test on every CI run executes the bundle in real QuickJS** — loads the bundle, builds the `TreeEngine` with the gallery tree and asserts with concrete values that `canUnlock`/`unlock`/`getBudget` decide exactly as the editor does. If the core ever stopped running in DOM-less JS, the gate falls.

### Jint (.NET / Unity)

[Jint](https://github.com/sebastienros/jint) interprets JS in pure .NET (no external processes; used by RavenDB and Orchard):

```csharp
var js = new Jint.Engine();
js.Execute(File.ReadAllText("yggdrasil-core.global.js"));
js.Execute($"var engine = new YggdrasilCore.TreeEngine(({docJson}).tree, {{ locale: 'gl' }})");
var can = js.Evaluate("JSON.stringify(engine.canUnlock('masa_dulce'))").AsString();
```

### puerts (Unreal and Unity)

[puerts](https://github.com/Tencent/puerts) (Tencent) embeds V8/QuickJS/Node into Unreal and Unity with TS bindings. Load the bundle as any global script and talk to `YggdrasilCore` from C++/C#/TS.

### GodotJS (Godot 4)

[GodotJS](https://github.com/godotjs/GodotJS) adds V8/QuickJS to Godot 4. Load the bundle as a global script and `YggdrasilCore.TreeEngine` becomes available from your scripts.

**Verification honesty, here too**: what CI guarantees is that the bundle runs in QuickJS — the same interpreter puerts and GodotJS use as their lightweight backend. The concrete per-engine integrations are not verified in our CI; if you build one, [tell us](https://github.com/cancioneschorriscortas-max/yggdrasil-forge/issues).

## What there is NOT (banked, by name)

No native C#/GDScript port (double maintenance and guaranteed drift — only with real demand), no `ygg export --flat`, no "official" Godot/Unity plugin for now. Roadmap §6 keeps their seat.
