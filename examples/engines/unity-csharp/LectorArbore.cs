// ── Yggdrasil Forge nun Unity, con Newtonsoft Json.NET ──
// Le un documento Yggdrasil (JSON co schema publicado) e lista os
// nodos cos seus custos e os recursos iniciais. É a inxestión mínima:
// a ESTRUTURA é trivial; a SEMÁNTICA de desbloqueo vive no motor —
// reimpleméntala ti ou embebe `@yggdrasil-forge/core/global` con
// Jint ou puerts (páxina «Yggdrasil no teu motor» da documentación).
//
// Por que Newtonsoft e non JsonUtility: o JsonUtility de serie non
// soporta dicionarios nin union types — e `label` é
// `string | { gl, en, … }`. Newtonsoft é paquete OFICIAL de Unity:
//   Window → Package Manager → + → Add package by name →
//   com.unity.nuget.newtonsoft-json
//
// Uso (exemplo): copia un ficheiro da galería a StreamingAssets e
//   var resumo = LectorArbore.Resumir(
//     File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "arbore.json")));
//   Debug.Log(resumo);

using System.Collections.Generic;
using System.Text;
using Newtonsoft.Json.Linq;

public static class LectorArbore
{
    public static string Resumir(string json)
    {
        var doc = JObject.Parse(json);
        var arbore = (JObject)doc["tree"];
        var saida = new StringBuilder();

        saida.AppendLine($"Árbore: {Label(arbore["label"])} (schema {(string)arbore["schemaVersion"]})");

        foreach (var recurso in arbore["resources"] as JArray ?? new JArray())
        {
            saida.AppendLine($"Recurso {Label(recurso["label"])} — inicial: {recurso["initial"] ?? 0}");
        }

        foreach (var nodo in (JArray)arbore["nodes"])
        {
            var custo = "gratis";
            if (nodo["costPerTier"] is JArray porRango && porRango.Count > 0)
            {
                // costPerTier[rango] = lista de { resourceId, amount }
                var partes = new List<string>();
                foreach (var c in (JArray)porRango[0])
                {
                    partes.Add($"{c["amount"]}×{(string)c["resourceId"]}");
                }
                custo = string.Join(", ", partes);
            }
            var rangos = (int?)nodo["maxTier"] ?? 1;
            saida.AppendLine($"- {Label(nodo["label"])} [{(string)nodo["id"]}] rangos: {rangos} · custo r1: {custo}");
        }

        foreach (var aresta in arbore["edges"] as JArray ?? new JArray())
        {
            saida.AppendLine($"  {(string)aresta["source"]} → {(string)aresta["target"]}");
        }

        return saida.ToString();
    }

    // LocalizedString = string | { "gl": …, "en": … }: resólvese sen máis.
    private static string Label(JToken l)
    {
        if (l is JValue v) return (string)v ?? "?";
        var d = (JObject)l;
        return (string)(d["gl"] ?? d["en"] ?? d.First?.First) ?? "?";
    }
}
