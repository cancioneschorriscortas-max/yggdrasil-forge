---
'@yggdrasil-forge/editor-react': minor
---

feat(editor-react): navegación por teclado nos menús + garda axe do chrome

Os menús Ficheiro, Paneis e Dispor seguen o patrón WAI-ARIA «menu
button» completo: ao abrir o foco vai á primeira entrada, frechas
(con volta) e Home/End navegan, Escape pecha e DEVOLVE o foco ao botón,
Tab pecha. Novo hook interno `useMenuKeyboard` compartido. Test a11y
permanente con jest-axe: cero violacións no shell e en cada panel.
