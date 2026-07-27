---
'@yggdrasil-forge/cli': minor
---

feat(cli): `ygg render` — o bucle xerar→ver→refinar péchase (7.17)

`ygg render <ficheiro|-> --out <f.svg> [--dark] [--locale gl] [--width N]`:
render headless da árbore a SVG autocontido (renderToStaticMarkup do
SkillTree real + standaloneSvg). Co pipeline completo — xerar →
validate → layout → render — unha IA pode VERSE e refinarse sen GUI.
`--locale` pre-resolve as labels do dato (sen tocar @react).
