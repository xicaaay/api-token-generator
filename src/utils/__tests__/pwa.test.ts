import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('PWA', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'))

  it('el manifest tiene lo necesario para ser instalable', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(
      true,
    )
  })

  it('todos los íconos del manifest existen', () => {
    for (const icon of manifest.icons as { src: string }[]) {
      expect(existsSync(join(root, 'public', icon.src)), icon.src).toBe(true)
    }
  })

  it('index.html enlaza el manifest', () => {
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain(
      'rel="manifest" href="/manifest.webmanifest"',
    )
  })
})
