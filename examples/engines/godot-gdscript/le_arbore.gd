extends SceneTree
# ── Yggdrasil Forge nun Godot 4.x, sen dependencias ──
# Le un documento Yggdrasil (JSON co schema publicado) e lista os
# nodos cos seus custos e os recursos iniciais. É a inxestión mínima:
# a ESTRUTURA é trivial de ler; a SEMÁNTICA de desbloqueo (canUnlock,
# exclusións, rangos) vive no motor — reimpleméntala ti ou embebe o
# bundle `@yggdrasil-forge/core/global` con GodotJS (ver a páxina
# «Yggdrasil no teu motor» da documentación).
#
# Uso: nun directorio cun `project.godot` mínimo (ou no teu proxecto),
# copia un ficheiro da galería (p.ex. panadeiro.json) como
# `arbore.json` á beira deste script e corre:
#   godot --headless --path . --script res://le_arbore.gd

func _init() -> void:
	var texto := FileAccess.get_file_as_string("res://arbore.json")
	var doc: Dictionary = JSON.parse_string(texto)
	var arbore: Dictionary = doc["tree"]

	print("Árbore: %s (schema %s)" % [_label(arbore["label"]), arbore["schemaVersion"]])

	for recurso: Dictionary in arbore.get("resources", []):
		print("Recurso %s — inicial: %s" % [_label(recurso["label"]), _num(recurso.get("initial", 0))])

	for nodo: Dictionary in arbore["nodes"]:
		var custo := "gratis"
		if nodo.has("costPerTier"):
			# costPerTier[rango] = lista de { resourceId, amount }
			var primeiro: Array = nodo["costPerTier"][0]
			var partes: Array[String] = []
			for c: Dictionary in primeiro:
				partes.append("%s×%s" % [_num(c["amount"]), c["resourceId"]])
			custo = ", ".join(partes)
		var rangos := int(nodo.get("maxTier", 1))
		print("- %s [%s] rangos: %d · custo r1: %s" % [_label(nodo["label"]), nodo["id"], rangos, custo])

	for aresta: Dictionary in arbore.get("edges", []):
		print("  %s → %s" % [aresta["source"], aresta["target"]])

	quit()


# JSON.parse_string dá floats para TODOS os números; os enteiros do
# documento (custos, iniciais) móstranse como enteiros.
func _num(v: Variant) -> Variant:
	if v is float and v == floorf(v):
		return int(v)
	return v


# LocalizedString = String | { "gl": …, "en": … }: resólvese sen librería.
func _label(l: Variant) -> String:
	if l is String:
		return l
	var d: Dictionary = l
	return d.get("gl", d.get("en", d.values()[0] if d.size() > 0 else "?"))
