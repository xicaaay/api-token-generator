import { describe, expect, it } from 'vitest'

import type { ApiKeyOptions, CharacterSetId } from '@/types/api-key'
import {
  CHARACTER_SET_OPTIONS,
  DEFAULT_OPTIONS,
  KEY_PRESETS,
  calculateCharsetEntropy,
  generateApiKey as generateWithOptions,
  generateApiKeys,
  getDownloadFilename,
  sha256Hex,
  validatePrefix,
} from '@/utils/api-key'

const charsOf = (id: CharacterSetId) => CHARACTER_SET_OPTIONS.find((o) => o.id === id)!.characters
const ALL_SETS: CharacterSetId[] = ['uppercase', 'lowercase', 'numbers', 'symbols']
const generateApiKey = (options: Partial<ApiKeyOptions>) =>
  generateWithOptions({ ...DEFAULT_OPTIONS, ...options })

describe('generateApiKey (caracteres)', () => {
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

  it('con un solo grupo la entropía es longitud × log2(pool)', () => {
    const key = generateApiKey({ length: 32, characterSets: ['numbers'] })
    expect(key.entropy).toBe(Math.floor(32 * Math.log2(10)))
  })

  it('descuenta de la entropía las claves a las que les falta algún grupo', () => {
    const naive = 32 * Math.log2(62)
    const key = generateApiKey({ length: 32, characterSets: ['uppercase', 'lowercase', 'numbers'] })
    expect(key.characterPoolSize).toBe(62)
    expect(key.entropy).toBeLessThan(naive)
    expect(key.entropy).toBeGreaterThan(naive - 1)
  })

  it('no repite claves', () => {
    const keys = new Set(
      Array.from(
        { length: 1000 },
        () => generateApiKey({ length: 32, characterSets: ALL_SETS }).value,
      ),
    )
    expect(keys.size).toBe(1000)
  })

  it('distribuye los caracteres de forma uniforme (sin sesgo de módulo)', () => {
    // 10 dígitos → si hubiera sesgo de módulo (256 % 10 = 6) los dígitos 0–5
    // saldrían ~2.3 % más que 6–9. Con 200 000 muestras eso es claramente detectable.
    const counts = new Map<string, number>()
    let generated = 0

    while (generated < 200_000) {
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

describe('calculateCharsetEntropy', () => {
  it('coincide con un conteo por fuerza bruta', () => {
    // Grupos de 2 y 3 caracteres, longitud 4: se cuentan las cadenas que tienen ambos grupos.
    const pool = ['a', 'b', '1', '2', '3']
    let valid = 0

    for (let n = 0; n < 5 ** 4; n += 1) {
      const chars = n
        .toString(5)
        .padStart(4, '0')
        .split('')
        .map((digit) => pool[Number(digit)]!)
      const hasLetter = chars.some((c) => 'ab'.includes(c))
      const hasNumber = chars.some((c) => '123'.includes(c))
      if (hasLetter && hasNumber) valid += 1
    }

    expect(calculateCharsetEntropy([2, 3], 4)).toBeCloseTo(Math.log2(valid), 10)
  })

  it('soporta longitudes grandes sin perder precisión', () => {
    expect(calculateCharsetEntropy([26], 128)).toBeCloseTo(128 * Math.log2(26), 6)
  })
})

describe('opciones', () => {
  it('URL-safe limita los símbolos a - _ . ~', () => {
    const allowed = new Set(
      charsOf('uppercase') + charsOf('lowercase') + charsOf('numbers') + '-_.~',
    )

    for (let i = 0; i < 100; i += 1) {
      const { value } = generateApiKey({ length: 64, characterSets: ALL_SETS, urlSafe: true })
      expect([...value].every((char) => allowed.has(char))).toBe(true)
    }
  })

  it('sin ambiguos nunca incluye 0 O 1 l I', () => {
    for (let i = 0; i < 200; i += 1) {
      const { value } = generateApiKey({
        length: 128,
        characterSets: ALL_SETS,
        excludeAmbiguous: true,
      })
      expect(value).not.toMatch(/[0O1lI]/)
    }
  })

  it('antepone el prefijo sin contarlo como entropía', () => {
    const plain = generateApiKey({ length: 32, characterSets: ['numbers'] })
    const prefixed = generateApiKey({ length: 32, characterSets: ['numbers'], prefix: 'sk_live_' })
    expect(prefixed.value.startsWith('sk_live_')).toBe(true)
    expect(prefixed.length).toBe(40)
    expect(prefixed.entropy).toBe(plain.entropy)
  })

  it('valida el prefijo', () => {
    expect(validatePrefix('sk_live_')).toBeNull()
    expect(validatePrefix('con espacio')).not.toBeNull()
    expect(validatePrefix('x'.repeat(33))).not.toBeNull()
    expect(() => generateApiKey({ prefix: 'a$b' })).toThrow()
  })
})

describe('formatos', () => {
  it('hex: 2 caracteres por byte', () => {
    const key = generateApiKey({ format: 'hex', bits: 256 })
    expect(key.value).toMatch(/^[0-9a-f]{64}$/)
    expect(key.entropy).toBe(256)
  })

  it('base64url: sin + / ni =', () => {
    const key = generateApiKey({ format: 'base64url', bits: 512 })
    expect(key.value).toMatch(/^[A-Za-z0-9_-]{86}$/)
    expect(key.entropy).toBe(512)
  })

  it('uuid: versión 4 válida', () => {
    const key = generateApiKey({ format: 'uuid' })
    expect(key.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(key.entropy).toBe(122)
  })

  it('rechaza tamaños de bits no soportados', () => {
    expect(() => generateApiKey({ format: 'hex', bits: 100 })).toThrow()
  })

  it('todos los presets generan una clave válida', () => {
    for (const preset of KEY_PRESETS) {
      const key = generateApiKey(preset.options)
      expect(key.value.length).toBeGreaterThan(0)
      expect(key.entropy).toBeGreaterThanOrEqual(122)
    }
  })
})

describe('generateApiKeys', () => {
  it('genera la cantidad pedida', () => {
    expect(generateApiKeys(DEFAULT_OPTIONS, 25)).toHaveLength(25)
  })

  it('limita la cantidad entre 1 y 100', () => {
    expect(() => generateApiKeys(DEFAULT_OPTIONS, 0)).toThrow()
    expect(() => generateApiKeys(DEFAULT_OPTIONS, 101)).toThrow()
  })
})

describe('sha256Hex', () => {
  it('coincide con el vector de prueba conocido', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('getDownloadFilename', () => {
  it('usa la fecha de creación en formato ISO', () => {
    const key = generateApiKey({ length: 16, characterSets: ['numbers'] })
    key.createdAt = new Date('2026-11-24T10:00:00Z')
    expect(getDownloadFilename(key)).toBe('api-key-2026-11-24.txt')
    expect(getDownloadFilename(key, 'csv')).toBe('api-key-2026-11-24.csv')
  })
})
