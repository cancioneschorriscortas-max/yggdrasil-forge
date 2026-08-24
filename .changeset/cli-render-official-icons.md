---
'@yggdrasil-forge/cli': patch
---

fix(cli): ygg render debuxa as iconas dos sets oficiais

O render non rexistraba NORSE_ICONS/LOGIC_ICONS, así que un documento
con `icon: "logic-key"` mostraba o id como texto de fallback en vez da
icona. Agora rexístranse coma no editor.
