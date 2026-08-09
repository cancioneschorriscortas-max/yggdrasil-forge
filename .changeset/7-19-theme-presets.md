---
'@yggdrasil-forge/editor-core': minor
'@yggdrasil-forge/editor-react': minor
---

feat: presets de tema con nome — Pergamiño, Néon e Bosque únense a Tintado/Neutro

Os presets saen do ThemePanel e pasan a dato en
`@editor-core/themePresets` (`THEME_PRESETS`: id + label localizada +
spec COMPLETO co preset anotado). Tintado e Neutro migran tal cal
(cero cambio visual; os tests do 7.5e son o contrato). Tres presets
curados novos con specs completos (5 estados + textColor): pergamino,
neon (pensado co chrome escuro) e bosque. O ThemePanel renderiza as
fichas desde o rexistro, en fila desprazable.
