// ── INICIO: Auth types ──
// Sistema de auth providers para fontes externas de progreso.
// Tokens NUNCA se persisten en storage; sempre obtidos via provider.

/**
 * Configuración de autenticación para fontes externas (Moodle, YouTube, etc.).
 */
export type AuthConfig =
  | { readonly type: 'none' }
  | { readonly type: 'bearer'; readonly token: string }
  | { readonly type: 'bearer'; readonly tokenProvider: string }
  | { readonly type: 'apikey'; readonly header: string; readonly key: string }
  | { readonly type: 'apikey'; readonly header: string; readonly keyProvider: string }
  | { readonly type: 'basic'; readonly username: string; readonly password: string }
  | { readonly type: 'custom'; readonly requestHandlerId: string }

/**
 * Provider de credenciais: función async que devolve o token actual.
 */
export type AuthProvider = () => Promise<string>

/**
 * Handler para o tipo 'custom' — recibe a request e devolve as cabeceiras.
 */
export type AuthRequestHandler = (request: {
  readonly url: string
  readonly method?: string
}) => Promise<Record<string, string>>
// ── FIN: Auth types ──
