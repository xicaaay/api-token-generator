import type {
  ApiKeyOptions,
  CharacterSetId,
  CharacterSetOption,
  GeneratedApiKey,
  KeyPreset,
} from '@/types/api-key'

export const MIN_LENGTH = 8
export const MAX_LENGTH = 128
export const BIT_OPTIONS = [128, 256, 512] as const
export const MAX_PREFIX_LENGTH = 32
export const PREFIX_PATTERN = /^[A-Za-z0-9_.-]*$/

const AMBIGUOUS_CHARACTERS = new Set('0O1lI')
/** Caracteres "unreserved" de RFC 3986: no necesitan escaparse en URLs ni en .env. */
const URL_SAFE_SYMBOLS = '-_.~'

export const CHARACTER_SET_OPTIONS: CharacterSetOption[] = [
  {
    id: 'uppercase',
    label: 'Mayúsculas',
    example: 'A–Z',
    characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  {
    id: 'lowercase',
    label: 'Minúsculas',
    example: 'a–z',
    characters: 'abcdefghijklmnopqrstuvwxyz',
  },
  {
    id: 'numbers',
    label: 'Números',
    example: '0–9',
    characters: '0123456789',
  },
  {
    id: 'symbols',
    label: 'Símbolos',
    example: '!@#',
    characters: '!@#$%^&*()-_=+[]{};:,.?',
  },
]

export const DEFAULT_OPTIONS: ApiKeyOptions = {
  format: 'charset',
  length: 32,
  bits: 256,
  characterSets: ['uppercase', 'lowercase', 'numbers'],
  urlSafe: false,
  excludeAmbiguous: false,
  prefix: '',
}

export const KEY_PRESETS: KeyPreset[] = [
  {
    id: 'custom',
    label: 'Personalizada',
    description: 'Elige longitud y caracteres.',
    options: { format: 'charset', prefix: '' },
  },
  {
    id: 'stripe',
    label: 'Estilo Stripe',
    description: 'sk_live_ + 32 caracteres alfanuméricos.',
    options: {
      format: 'charset',
      length: 32,
      characterSets: ['uppercase', 'lowercase', 'numbers'],
      urlSafe: false,
      excludeAmbiguous: false,
      prefix: 'sk_live_',
    },
  },
  {
    id: 'hex',
    label: 'Hex 256 bits',
    description: '64 caracteres hexadecimales.',
    options: { format: 'hex', bits: 256, prefix: '' },
  },
  {
    id: 'jwt',
    label: 'Secreto JWT',
    description: '512 bits en Base64url, ideal para HS512.',
    options: { format: 'base64url', bits: 512, prefix: '' },
  },
  {
    id: 'uuid',
    label: 'UUID v4',
    description: 'Identificador único estándar (122 bits).',
    options: { format: 'uuid', prefix: '' },
  },
  {
    id: 'database',
    label: 'Password de BD',
    description: 'Segura para DATABASE_URL: sin caracteres que haya que escapar.',
    options: {
      format: 'charset',
      length: 32,
      characterSets: ['uppercase', 'lowercase', 'numbers', 'symbols'],
      urlSafe: true,
      excludeAmbiguous: true,
      prefix: '',
    },
  },
]

/** Caracteres efectivos de un grupo según las opciones URL-safe y sin ambiguos. */
export function getCharacters(
  id: CharacterSetId,
  { urlSafe, excludeAmbiguous }: Pick<ApiKeyOptions, 'urlSafe' | 'excludeAmbiguous'>,
): string {
  const option = CHARACTER_SET_OPTIONS.find((item) => item.id === id)

  if (!option) {
    throw new Error(`Unknown character set: ${id}`)
  }

  const base = id === 'symbols' && urlSafe ? URL_SAFE_SYMBOLS : option.characters
  return excludeAmbiguous
    ? [...base].filter((char) => !AMBIGUOUS_CHARACTERS.has(char)).join('')
    : base
}

function getSecureRandomIndex(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 256) {
    throw new Error('Invalid random range')
  }

  // Rejection sampling: descarta los bytes que producirían sesgo de módulo.
  const largestValidByte = Math.floor(256 / maxExclusive) * maxExclusive
  const randomByte = new Uint8Array(1)

  do {
    crypto.getRandomValues(randomByte)
  } while (randomByte[0]! >= largestValidByte)

  return randomByte[0]! % maxExclusive
}

function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count)
  crypto.getRandomValues(bytes)
  return bytes
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** log2 de un BigInt positivo con precisión de double. */
function log2BigInt(value: bigint): number {
  const bits = value.toString(2).length
  const shift = Math.max(0, bits - 53)
  return Math.log2(Number(value >> BigInt(shift))) + shift
}

/**
 * Entropía exacta de una cadena uniforme de `length` caracteres que contiene al
 * menos uno de cada grupo: log2 del número de cadenas válidas, contadas por
 * inclusión–exclusión: Σ (−1)^|S| · (pool − |S|)^length.
 */
export function calculateCharsetEntropy(groupSizes: number[], length: number): number {
  const pool = groupSizes.reduce((sum, size) => sum + size, 0)
  const exponent = BigInt(length)
  let validStrings = 0n

  for (let mask = 0; mask < 1 << groupSizes.length; mask += 1) {
    let excluded = 0
    let excludedGroups = 0

    groupSizes.forEach((size, index) => {
      if (mask & (1 << index)) {
        excluded += size
        excludedGroups += 1
      }
    })

    const term = BigInt(pool - excluded) ** exponent
    validStrings += excludedGroups % 2 === 0 ? term : -term
  }

  return validStrings > 0n ? log2BigInt(validStrings) : 0
}

function generateCharsetSecret(groups: string[], length: number): string {
  const pool = groups.join('')

  // Se sortea la clave completa del pool y se descarta si falta algún grupo.
  // Así el resultado es uniforme entre todas las claves válidas y la entropía
  // mostrada es exacta (no hay posiciones "forzadas" predecibles).
  for (;;) {
    const characters = Array.from({ length }, () => pool[getSecureRandomIndex(pool.length)]!)
    const hasEveryGroup = groups.every((group) => characters.some((char) => group.includes(char)))

    if (hasEveryGroup) {
      return characters.join('')
    }
  }
}

export function validatePrefix(prefix: string): string | null {
  if (prefix.length > MAX_PREFIX_LENGTH) {
    return `El prefijo admite hasta ${MAX_PREFIX_LENGTH} caracteres`
  }

  if (!PREFIX_PATTERN.test(prefix)) {
    return 'El prefijo solo admite letras, números, guion, guion bajo y punto'
  }

  return null
}

export function generateApiKey(options: ApiKeyOptions): GeneratedApiKey {
  const prefixError = validatePrefix(options.prefix)

  if (prefixError) {
    throw new Error(prefixError)
  }

  const base = {
    id: crypto.randomUUID(),
    format: options.format,
    prefix: options.prefix,
    createdAt: new Date(),
  }

  if (options.format === 'uuid') {
    const value = options.prefix + crypto.randomUUID()
    return {
      ...base,
      value,
      length: value.length,
      characterSets: [],
      characterPoolSize: 16,
      entropy: 122,
    }
  }

  if (options.format === 'hex' || options.format === 'base64url') {
    if (!BIT_OPTIONS.includes(options.bits as (typeof BIT_OPTIONS)[number])) {
      throw new Error('Invalid bit size')
    }

    const bytes = randomBytes(options.bits / 8)
    const encoded = options.format === 'hex' ? toHex(bytes) : toBase64Url(bytes)
    const value = options.prefix + encoded

    return {
      ...base,
      value,
      length: value.length,
      characterSets: [],
      characterPoolSize: options.format === 'hex' ? 16 : 64,
      entropy: options.bits,
    }
  }

  const uniqueCharacterSets = CHARACTER_SET_OPTIONS.map((option) => option.id).filter((id) =>
    options.characterSets.includes(id),
  )

  if (uniqueCharacterSets.length === 0) {
    throw new Error('Select at least one character set')
  }

  if (options.length < uniqueCharacterSets.length) {
    throw new Error('Length is shorter than the selected character sets')
  }

  const groups = uniqueCharacterSets.map((id) => getCharacters(id, options))
  const secret = generateCharsetSecret(groups, options.length)
  const value = options.prefix + secret

  return {
    ...base,
    value,
    length: value.length,
    characterSets: uniqueCharacterSets,
    characterPoolSize: groups.join('').length,
    entropy: Math.floor(
      calculateCharsetEntropy(
        groups.map((group) => group.length),
        options.length,
      ),
    ),
  }
}

export function generateApiKeys(options: ApiKeyOptions, count: number): GeneratedApiKey[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('Count must be between 1 and 100')
  }

  return Array.from({ length: count }, () => generateApiKey(options))
}

export function getDownloadFilename(apiKey: GeneratedApiKey, extension = 'txt'): string {
  const date = apiKey.createdAt.toISOString().slice(0, 10)
  return `api-key-${date}.${extension}`
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return toHex(new Uint8Array(digest))
}
