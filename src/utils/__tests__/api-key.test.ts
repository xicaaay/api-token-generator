import { describe, expect, it } from 'vitest'

import type { CharacterSetId } from '@/types/api-key'
import { CHARACTER_SET_OPTIONS, generateApiKey, getDownloadFilename } from '@/utils/api-key'

const charsOf = (id: CharacterSetId) => CHARACTER_SET_OPTIONS.find((o) => o.id === id)!.characters
const ALL_SETS: CharacterSetId[] = ['uppercase', 'lowercase', 'numbers', 'symbols']

describe('generateApiKey', () => {
  it('respeta la longitud solicitada', () => {
    for (const length of [4, 8, 32, 128]) {
      expect(generateApiKey({ length, characterSets: ALL_SETS }).value).toHaveLength(length)
    }
  })

  it('solo usa caracteres de los grupos seleccionados', () => {
    const allowed = new Set(charsOf('lowercase') + charsOf('numbers'))

    for (let i = 0; i < 200; i += 1) {
      const { value } = generateApiKey({ length: 64, characterSets: ['lowercase', 'numbers'] })
      expect([...value].every((char) => allowed.has(char))).toBe(true)
    }
  })

  it('incluye al menos un carácter de cada grupo seleccionado', () => {
    // Con longitud mínima es donde más fácil fallaría la garantía.
    for (let i = 0; i < 500; i += 1) {
      const { value } = generateApiKey({ length: ALL_SETS.length, characterSets: ALL_SETS })

      for (const id of ALL_SETS) {
        expect([...value].some((char) => charsOf(id).includes(char))).toBe(true)
      }
    }
  })

  it('ignora grupos duplicados', () => {
    const key = generateApiKey({ length: 16, characterSets: ['numbers', 'numbers'] })
    expect(key.characterSets).toEqual(['numbers'])
    expect(key.characterPoolSize).toBe(10)
  })

  it('rechaza configuraciones inválidas', () => {
    expect(() => generateApiKey({ length: 16, characterSets: [] })).toThrow()
    expect(() => generateApiKey({ length: 3, characterSets: ALL_SETS })).toThrow()
  })

  it('calcula la entropía como longitud × log2(tamaño del pool)', () => {
    const key = generateApiKey({ length: 32, characterSets: ['uppercase', 'lowercase', 'numbers'] })
    expect(key.characterPoolSize).toBe(62)
    expect(key.entropy).toBe(Math.round(32 * Math.log2(62)))
  })

  it('no repite claves', () => {
    const keys = new Set(
      Array.from({ length: 1000 }, () =>
        generateApiKey({ length: 32, characterSets: ALL_SETS }).value,
      ),
    )
    expect(keys.size).toBe(1000)
  })

  it('distribuye los caracteres de forma uniforme (sin sesgo de módulo)', () => {
    // 10 dígitos → si hubiera sesgo de módulo (256 % 10 = 6) los dígitos 0–5
    // saldrían ~2.3 % más que 6–9. Con 200 000 muestras eso es claramente detectable.
    const samples = 200_000
    const counts = new Map<string, number>()
    let generated = 0

    while (generated < samples) {
      const { value } = generateApiKey({ length: 128, characterSets: ['numbers'] })
      for (const digit of value) counts.set(digit, (counts.get(digit) ?? 0) + 1)
      generated += value.length
    }

    const expected = generated / 10
    // Chi-cuadrado con 9 g.l. Umbral 40 ≈ p < 0.00001 (no falla por azar),
    // mientras que un sesgo de módulo real daría un valor cercano a 73.
    const chiSquare = [...counts.values()].reduce(
      (sum, observed) => sum + (observed - expected) ** 2 / expected,
      0,
    )

    expect(counts.size).toBe(10)
    expect(chiSquare).toBeLessThan(40)
  })
})

describe('getDownloadFilename', () => {
  it('usa la fecha de creación en formato ISO', () => {
    const key = generateApiKey({ length: 16, characterSets: ['numbers'] })
    key.createdAt = new Date('2026-11-24T10:00:00Z')
    expect(getDownloadFilename(key)).toBe('api-key-2026-11-24.txt')
  })
})
