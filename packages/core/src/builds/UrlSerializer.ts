// packages/core/src/builds/UrlSerializer.ts
// ── INICIO: UrlSerializer ──
// Funcións puras síncronas para codificar/decodificar Builds en
// formato URL-safe (base64url).
//
// Composición: serialize → base64url para encode; base64url →
// deserialize para decode.

import { ErrorCode, YggdrasilError, getErrorMessage } from '@yggdrasil-forge/common'
import type { Build, Result } from '../types/index.js'
import { err } from '../types/index.js'
import { deserialize, serialize } from './BuildSerializer.js'
import { decodeBase64Url, encodeBase64Url } from './base64url.js'

/**
 * Codifica unha Build a un string URL-safe (base64url do JSON).
 *
 * O resultado é seguro para usar como path segment ou query param
 * sen URL encoding adicional (cero `+`, `/`, `=`).
 *
 * @example
 * const code = encodeForUrl(build)
 * // 'eyJpZCI6...'
 */
export function encodeForUrl(build: Build): string {
  return encodeBase64Url(serialize(build))
}

/**
 * Decodifica un código URL-safe a Build. Devolve Result<Build>.
 *
 * Errores posibles:
 * - `SHARE_LINK_DECODE_FAILED` (`YGG_B003`): base64url decode falla
 *   (input inválido).
 * - `BUILD_DESERIALIZE_FAILED` (`YGG_B001`): JSON parse falla tras
 *   decode (raro pero posible se corrupción).
 * - `BUILD_INVALID_SHAPE` (`YGG_B002`): shape do JSON non coincide
 *   con Build.
 */
export function decodeFromUrl(code: string): Result<Build> {
  let json: string
  try {
    json = decodeBase64Url(code)
  } catch (e) {
    return err(
      new YggdrasilError(
        ErrorCode.SHARE_LINK_DECODE_FAILED,
        getErrorMessage(ErrorCode.SHARE_LINK_DECODE_FAILED, 'gl'),
        /* v8 ignore next -- catch(e): atob always throws Error subclass */
        { ...(e instanceof Error ? { cause: e } : {}) },
      ),
    )
  }
  return deserialize(json)
}
// ── FIN: UrlSerializer ──
