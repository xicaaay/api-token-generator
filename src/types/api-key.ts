export type ComplexityLevel = 'simple' | 'standard' | 'advanced'

export interface ComplexityOption {
  id: ComplexityLevel
  label: string
  description: string
  characters: string
}

export interface ApiKeyOptions {
  prefix: string
  length: number
  complexity: ComplexityLevel
}

export interface GeneratedApiKey {
  id: string
  value: string
  prefix: string
  randomLength: number
  totalLength: number
  complexity: ComplexityLevel
  entropy: number
  createdAt: Date
}
