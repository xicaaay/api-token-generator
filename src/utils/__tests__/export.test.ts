import { describe, expect, it } from 'vitest'

import type { GeneratedApiKey } from '@/types/api-key'
import { toCsv, toEnv, toJson } from '@/utils/export'

const key = (value: string): GeneratedApiKey => ({
  id: value,
  value,
  format: 'charset',
  prefix: '',
  length: value.length,
  characterSets: ['symbols'],
  characterPoolSize: 23,
  entropy: 100,
  createdAt: new Date('2026-11-24T10:00:00Z'),
})

describe('export', () => {
  it('.env usa comillas simples para que $ no se interpole', () => {
    expect(toEnv([{ key: key('a$HOME#b'), sha256: 'h' }])).toBe("API_KEY='a$HOME#b'\n")
  })

  it('.env numera las variables en lote', () => {
    const out = toEnv([
      { key: key('one'), sha256: 'h1' },
      { key: key('two'), sha256: 'h2' },
    ])
    expect(out).toBe("API_KEY_1='one'\nAPI_KEY_2='two'\n")
  })

  it('CSV escapa comas y comillas', () => {
    const out = toCsv([{ key: key('a,b"c'), sha256: 'h' }])
    expect(out.split('\r\n')[1]).toBe('"a,b""c","h","charset","5","100","2026-11-24T10:00:00.000Z"')
  })

  it('JSON incluye valor, hash y metadatos', () => {
    const [row] = JSON.parse(toJson([{ key: key('abc'), sha256: 'h' }]))
    expect(row).toEqual({
      value: 'abc',
      sha256: 'h',
      format: 'charset',
      length: 3,
      entropyBits: 100,
      createdAt: '2026-11-24T10:00:00.000Z',
    })
  })
})
