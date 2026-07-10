import type {
  ApiKeyOptions,
  ComplexityLevel,
  ComplexityOption,
  GeneratedApiKey,
} from '@/types/api-key'

const SIMPLE_CHARACTERS = 'abcdefghijkmnopqrstuvwxyz23456789'
const STANDARD_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const ADVANCED_CHARACTERS = `${STANDARD_CHARACTERS}-._~`

export const COMPLEXITY_OPTIONS: ComplexityOption[] = [
  {
    id: 'simple',
    label: 'Simple',
    description: 'Minúsculas y números sin caracteres ambiguos.',
    characters: SIMPLE_CHARACTERS,
  },
  {
    id: 'standard',
    label: 'Estándar',
    description: 'Mayúsculas, minúsculas y números.',
    characters: STANDARD_CHARACTERS,
  },
  {
    id: 'advanced',
    label: 'Avanzada',
    description: 'Agrega símbolos seguros para URLs.',
    characters: ADVANCED_CHARACTERS,
  },
]

export function sanitizePrefix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18)
}

function getCharacters(complexity: ComplexityLevel): string {
  return (
    COMPLEXITY_OPTIONS.find((option) => option.id === complexity)?.characters ?? STANDARD_CHARACTERS
  )
}

function createSecureRandomString(length: number, characters: string): string {
  const characterCount = characters.length
  const largestValidByte = Math.floor(256 / characterCount) * characterCount
  let result = ''

  while (result.length < length) {
    const remaining = length - result.length
    const randomBytes = new Uint8Array(Math.max(remaining * 2, 32))
    crypto.getRandomValues(randomBytes)

    for (const byte of randomBytes) {
      if (byte >= largestValidByte) {
        continue
      }

      result += characters.charAt(byte % characterCount)

      if (result.length === length) {
        break
      }
    }
  }

  return result
}

export function generateApiKey(options: ApiKeyOptions): GeneratedApiKey {
  const prefix = sanitizePrefix(options.prefix)
  const characters = getCharacters(options.complexity)
  const randomValue = createSecureRandomString(options.length, characters)
  const value = prefix ? `${prefix}_${randomValue}` : randomValue

  return {
    id: crypto.randomUUID(),
    value,
    prefix,
    randomLength: options.length,
    totalLength: value.length,
    complexity: options.complexity,
    entropy: Math.round(options.length * Math.log2(characters.length)),
    createdAt: new Date(),
  }
}

export function getDownloadFilename(apiKey: GeneratedApiKey): string {
  const date = apiKey.createdAt.toISOString().slice(0, 10)
  const prefix = apiKey.prefix || 'api-key'

  return `${prefix}-${date}.txt`
}
