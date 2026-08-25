// ── INICIO: icons/imageRef ──
// O criterio ÚNICO de «este string de icona é un recurso de imaxe»
// (F11.3, extraído no 17.2 para que grafo e tarxetas compartan a mesma
// verdade en vez de manter dúas copias que derivarían).
//
// É imaxe se: http(s):// · protocolo-relativa // · data: · ruta
// (/ ./ ../) · ou remata en extensión de imaxe
// (webp/avif/png/jpg/jpeg/gif/svg). Calquera outra cadea (emoji, char,
// id sen rexistrar) cae á rama de texto do chamador.

/** `true` se o string de `node.icon` apunta a un recurso de imaxe. */
export function isImageRef(ref: string): boolean {
  return (
    /^(?:https?:)?\/\//.test(ref) ||
    /^data:/i.test(ref) ||
    /^\.{0,2}\//.test(ref) ||
    /\.(?:webp|avif|png|jpe?g|gif|svg)$/i.test(ref)
  )
}
// ── FIN: icons/imageRef ──
