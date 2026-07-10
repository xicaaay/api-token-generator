import type {
  ApiKeyOptions,
  CharacterSetId,
  CharacterSetOption,
  GeneratedApiKey,
} from '@/types/api-key'

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

function getOption(id: CharacterSetId): CharacterSetOption {
  const option = CHARACTER_SET_OPTIONS.find((item) => item.id === id)

  if (!option) {
    throw new Error(`Unknown character set: ${id}`)
  }

  return option
}

function getSecureRandomIndex(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 256) {
    throw new Error('Invalid random range')
  }

  const largestValidByte = Math.floor(256 / maxExclusive) * maxExclusive
  const randomByte = new Uint8Array(1)

  do {
    crypto.getRandomValues(randomByte)
  } while (randomByte[0]! >= largestValidByte)

  return randomByte[0]! % maxExclusive
}

function getSecureCharacter(characters: string): string {
  return characters[getSecureRandomIndex(characters.length)] ?? ''
}

function secureShuffle(values: string[]): string[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = getSecureRandomIndex(index + 1)
    const currentValue = shuffled[index]!
    shuffled[index] = shuffled[randomIndex]!
    shuffled[randomIndex] = currentValue
  }

  return shuffled
}

export function generateApiKey(options: ApiKeyOptions): GeneratedApiKey {
  const uniqueCharacterSets = [...new Set(options.characterSets)]

  if (uniqueCharacterSets.length === 0) {
    throw new Error('Select at least one character set')
  }

  if (options.length < uniqueCharacterSets.length) {
    throw new Error('Length is shorter than the selected character sets')
  }

  const selectedOptions = uniqueCharacterSets.map(getOption)
  const characterPool = selectedOptions.map((option) => option.characters).join('')
  const requiredCharacters = selectedOptions.map((option) => getSecureCharacter(option.characters))
  const remainingCharacters = Array.from(
    { length: options.length - requiredCharacters.length },
    () => getSecureCharacter(characterPool),
  )
  const value = secureShuffle([...requiredCharacters, ...remainingCharacters]).join('')

  return {
    id: crypto.randomUUID(),
    value,
    length: options.length,
    characterSets: uniqueCharacterSets,
    characterPoolSize: characterPool.length,
    entropy: Math.round(options.length * Math.log2(characterPool.length)),
    createdAt: new Date(),
  }
}

export function getDownloadFilename(apiKey: GeneratedApiKey): string {
  const date = apiKey.createdAt.toISOString().slice(0, 10)
  return `api-key-${date}.txt`
}
