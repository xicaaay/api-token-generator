export type CharacterSetId = 'uppercase' | 'lowercase' | 'numbers' | 'symbols'

export interface CharacterSetOption {
  id: CharacterSetId
  label: string
  example: string
  characters: string
}

export interface ApiKeyOptions {
  length: number
  characterSets: CharacterSetId[]
}

export interface GeneratedApiKey {
  id: string
  value: string
  length: number
  characterSets: CharacterSetId[]
  characterPoolSize: number
  entropy: number
  createdAt: Date
}
