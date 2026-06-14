// packages/core/src/builds/base64url.ts
// ── INICIO: base64url ──
// Helper interno para codificación URL-safe base64.
//
// **Cero deps**. Usa standards Node 16+ e browsers modernos:
// - `TextEncoder` / `TextDecoder` (Encoding Standard).
// - `btoa` / `atob` (HTML Living Standard; tamén en globalThis de
//   Node 16+).
//
// Diferencia con base64 estándar:
// - `+` → `-`
// - `/` → `_`
// - Padding `=` eliminado.
//
// Iso fai os strings safe para usar en URLs sen URL encoding.

/**
 * Codifica un string UTF-8 a base64url.
 *
 * @example
 * encodeBase64Url('{"hello":"world"}')
 * // 'eyJoZWxsbyI6IndvcmxkIn0'
 */
export function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodifica un string base64url a UTF-8.
 *
 * Lanza `DOMException` (ou erro similar) se o input non é base64
 * válido. **Os chamantes deben envolvelo en try/catch**.
 */
export function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
// ── FIN: base64url ──
