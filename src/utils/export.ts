import type { GeneratedApiKey } from '@/types/api-key'

export type ExportFormat = 'env' | 'json' | 'csv'

export interface ExportableKey {
  key: GeneratedApiKey
  sha256: string
}

export const EXPORT_FORMATS: Record<
  ExportFormat,
  { label: string; extension: string; mime: string }
> = {
  env: { label: '.env', extension: 'env', mime: 'text/plain' },
  json: { label: 'JSON', extension: 'json', mime: 'application/json' },
  csv: { label: 'CSV', extension: 'csv', mime: 'text/csv' },
}

/**
 * Comillas simples: dotenv no interpola `$VAR` dentro de ellas. Ningún grupo de
 * caracteres incluye comilla simple, así que el valor nunca necesita escaparse.
 */
export function toEnv(keys: ExportableKey[], variableName = 'API_KEY'): string {
  return (
    keys
      .map(({ key }, index) => {
        const name = keys.length === 1 ? variableName : `${variableName}_${index + 1}`
        return `${name}='${key.value}'`
      })
      .join('\n') + '\n'
  )
}

export function toJson(keys: ExportableKey[]): string {
  const rows = keys.map(({ key, sha256 }) => ({
    value: key.value,
    sha256,
    format: key.format,
    length: key.length,
    entropyBits: key.entropy,
    createdAt: key.createdAt.toISOString(),
  }))

  return JSON.stringify(rows, null, 2) + '\n'
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

export function toCsv(keys: ExportableKey[]): string {
  const header = ['value', 'sha256', 'format', 'length', 'entropy_bits', 'created_at']
  const rows = keys.map(({ key, sha256 }) =>
    [key.value, sha256, key.format, key.length, key.entropy, key.createdAt.toISOString()]
      .map(csvCell)
      .join(','),
  )

  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

export function serialize(format: ExportFormat, keys: ExportableKey[]): string {
  if (format === 'env') return toEnv(keys)
  if (format === 'json') return toJson(keys)
  return toCsv(keys)
}
