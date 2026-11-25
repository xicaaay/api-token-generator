export type CharacterSetId = 'uppercase' | 'lowercase' | 'numbers' | 'symbols'

/** charset: caracteres a elegir · hex/base64url: bytes aleatorios codificados · uuid: UUID v4 */
export type KeyFormat = 'charset' | 'hex' | 'base64url' | 'uuid'

export interface CharacterSetOption {
  id: CharacterSetId
  label: string
  example: string
  characters: string
}

export interface ApiKeyOptions {
  format: KeyFormat
  /** Cantidad de caracteres (solo formato charset). */
  length: number
  /** Bits aleatorios (formatos hex y base64url). */
  bits: number
  characterSets: CharacterSetId[]
  /** Restringe los símbolos a caracteres seguros en URLs y archivos .env. */
  urlSafe: boolean
  /** Quita caracteres que se confunden al leerlos: 0 O 1 l I. */
  excludeAmbiguous: boolean
  /** Texto fijo al inicio, p. ej. "sk_live_". No aporta entropía. */
  prefix: string
}

export interface GeneratedApiKey {
  id: string
  /** Clave completa, con prefijo. */
  value: string
  format: KeyFormat
  prefix: string
  /** Longitud total de `value`. */
  length: number
  characterSets: CharacterSetId[]
  /** Caracteres posibles por posición (0 cuando no aplica). */
  characterPoolSize: number
  /** Entropía real en bits (redondeada). */
  entropy: number
  createdAt: Date
}

export interface KeyPreset {
  id: string
  label: string
  description: string
  options: Partial<ApiKeyOptions>
}
