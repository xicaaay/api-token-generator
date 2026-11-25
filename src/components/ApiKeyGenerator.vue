<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Copy, Download, Eye, EyeOff, Minus, Plus, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'

import type { ApiKeyOptions, CharacterSetId, GeneratedApiKey, KeyFormat } from '@/types/api-key'
import {
  BIT_OPTIONS,
  CHARACTER_SET_OPTIONS,
  DEFAULT_OPTIONS,
  KEY_PRESETS,
  MAX_LENGTH,
  MAX_PREFIX_LENGTH,
  MIN_LENGTH,
  generateApiKeys,
  getCharacters,
  getDownloadFilename,
  sha256Hex,
  validatePrefix,
} from '@/utils/api-key'
import { EXPORT_FORMATS, type ExportFormat, serialize } from '@/utils/export'

const MAX_COUNT = 100

const FORMAT_LABELS: Record<KeyFormat, string> = {
  charset: 'Caracteres',
  hex: 'Hex',
  base64url: 'Base64url',
  uuid: 'UUID v4',
}

const options = ref<ApiKeyOptions>({
  ...DEFAULT_OPTIONS,
  characterSets: [...DEFAULT_OPTIONS.characterSets],
})
const activePresetId = ref('custom')
const count = ref(1)
const generatedKeys = ref<GeneratedApiKey[]>([])
const primaryHash = ref('')
const isVisible = ref(true)

const primaryKey = computed(() => generatedKeys.value[0] ?? null)
const isBatch = computed(() => generatedKeys.value.length > 1)
const prefixError = computed(() => validatePrefix(options.value.prefix))
const usesCharacters = computed(() => options.value.format === 'charset')
const usesBits = computed(
  () => options.value.format === 'hex' || options.value.format === 'base64url',
)

const symbolsExample = computed(() =>
  options.value.urlSafe ? getCharacters('symbols', options.value) : '!@#',
)

function mask(value: string): string {
  return isVisible.value ? value : '•'.repeat(value.length)
}

const strengthLabel = computed(() => {
  const entropy = primaryKey.value?.entropy ?? 0

  if (entropy >= 180) return 'Muy fuerte'
  if (entropy >= 100) return 'Fuerte'
  if (entropy >= 60) return 'Buena'
  return 'Básica'
})

function isEnabled(id: CharacterSetId): boolean {
  return options.value.characterSets.includes(id)
}

function markCustom(): void {
  activePresetId.value = 'custom'
}

function applyPreset(presetId: string): void {
  const preset = KEY_PRESETS.find((item) => item.id === presetId)
  if (!preset) return

  options.value = {
    ...options.value,
    ...preset.options,
    characterSets: [...(preset.options.characterSets ?? options.value.characterSets)],
  }
  activePresetId.value = presetId
  createKeys(false)
}

function clampLength(): void {
  const parsedLength = Number(options.value.length)
  options.value.length = Math.min(
    MAX_LENGTH,
    Math.max(MIN_LENGTH, Math.round(parsedLength || MIN_LENGTH)),
  )
}

function adjustLength(amount: number): void {
  options.value.length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, options.value.length + amount))
  markCustom()
}

function onLengthChange(): void {
  clampLength()
  markCustom()
}

function selectBits(bits: number): void {
  options.value.bits = bits
  markCustom()
  createKeys(false)
}

function clampCount(): void {
  const parsed = Math.round(Number(count.value) || 1)
  count.value = Math.min(MAX_COUNT, Math.max(1, parsed))
}

function toggleCharacterSet(id: CharacterSetId): void {
  if (isEnabled(id) && options.value.characterSets.length === 1) {
    toast.error('Selecciona al menos un tipo de carácter')
    return
  }

  options.value.characterSets = isEnabled(id)
    ? options.value.characterSets.filter((item) => item !== id)
    : [...options.value.characterSets, id]
  markCustom()
}

function createKeys(showNotification = true): void {
  clampLength()
  clampCount()

  if (prefixError.value) {
    toast.error(prefixError.value)
    return
  }

  try {
    generatedKeys.value = generateApiKeys(options.value, count.value)
    isVisible.value = true

    if (showNotification) {
      toast.success(
        isBatch.value ? `${generatedKeys.value.length} claves generadas` : 'Nueva clave generada',
      )
    }
  } catch {
    toast.error('No fue posible generar la clave')
  }
}

watch(primaryKey, async (key) => {
  primaryHash.value = ''
  if (!key) return

  const hash = await sha256Hex(key.value)
  if (primaryKey.value?.id === key.id) primaryHash.value = hash
})

async function copyText(text: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    const copied = document.execCommand('copy')
    textarea.remove()

    if (copied) {
      toast.success(successMessage)
    } else {
      toast.error('No fue posible copiar')
    }
  }
}

function copyKey(value = primaryKey.value?.value): void {
  if (!value) {
    toast.error('Primero genera una clave')
    return
  }

  void copyText(value, 'Clave copiada')
}

function copyAll(): void {
  void copyText(generatedKeys.value.map((key) => key.value).join('\n'), 'Claves copiadas')
}

function copyHash(): void {
  if (primaryHash.value) void copyText(primaryHash.value, 'Hash SHA-256 copiado')
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function describe(key: GeneratedApiKey): string {
  if (key.format !== 'charset') return FORMAT_LABELS[key.format]

  return CHARACTER_SET_OPTIONS.filter((option) => key.characterSets.includes(option.id))
    .map((option) => option.label)
    .join(', ')
}

function downloadKey(): void {
  const key = primaryKey.value

  if (!key) {
    toast.error('Primero genera una clave')
    return
  }

  const content = [
    'API KEY',
    '=======',
    '',
    key.value,
    '',
    `Formato: ${describe(key)}`,
    `Longitud: ${key.length} caracteres`,
    `Entropía: ${key.entropy} bits`,
    `SHA-256: ${primaryHash.value}`,
    `Generada: ${key.createdAt.toLocaleString('es-GT')}`,
    '',
    'Guarda esta clave en un lugar seguro.',
    'En tu base de datos guarda solo el hash SHA-256, nunca la clave en claro.',
  ].join('\n')

  downloadFile(content, getDownloadFilename(key), 'text/plain')
  toast.success('Clave descargada')
}

async function exportKeys(format: ExportFormat): Promise<void> {
  const keys = generatedKeys.value
  const first = keys[0]
  if (!first) return

  const exportable = await Promise.all(
    keys.map(async (key) => ({ key, sha256: await sha256Hex(key.value) })),
  )
  const { extension, mime } = EXPORT_FORMATS[format]
  const filename =
    format === 'env'
      ? `api-keys-${first.createdAt.toISOString().slice(0, 10)}.env`
      : getDownloadFilename(first, extension).replace('api-key-', 'api-keys-')

  downloadFile(serialize(format, exportable), filename, mime)
  toast.success(`Exportado como ${EXPORT_FORMATS[format].label}`)
}

onMounted(() => createKeys(false))
</script>

<template>
  <section class="generator" aria-labelledby="generator-title">
    <header class="hero">
      <h1 id="generator-title">Genera una clave segura.</h1>
      <p>Todo ocurre en tu navegador: nada se envía ni se guarda.</p>
    </header>

    <div class="preset-bar" role="radiogroup" aria-label="Formato de la clave">
      <button
        v-for="preset in KEY_PRESETS"
        :key="preset.id"
        type="button"
        role="radio"
        class="chip"
        :class="{ active: activePresetId === preset.id }"
        :aria-checked="activePresetId === preset.id"
        :title="preset.description"
        @click="applyPreset(preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div class="panel">
      <div class="controls">
        <div v-if="usesCharacters" class="field">
          <div class="field-row">
            <label for="key-length">Longitud</label>
            <div class="stepper">
              <button
                type="button"
                aria-label="Reducir longitud"
                :disabled="options.length <= MIN_LENGTH"
                @click="adjustLength(-1)"
              >
                <Minus />
              </button>
              <input
                id="key-length"
                v-model.number="options.length"
                type="number"
                inputmode="numeric"
                :min="MIN_LENGTH"
                :max="MAX_LENGTH"
                @change="onLengthChange"
              />
              <button
                type="button"
                aria-label="Aumentar longitud"
                :disabled="options.length >= MAX_LENGTH"
                @click="adjustLength(1)"
              >
                <Plus />
              </button>
            </div>
          </div>
          <input
            v-model.number="options.length"
            class="range"
            type="range"
            :min="MIN_LENGTH"
            :max="MAX_LENGTH"
            aria-label="Longitud de la clave"
            @input="markCustom"
          />
        </div>

        <div v-if="usesBits" class="field">
          <span class="label">Tamaño</span>
          <div class="segmented" role="radiogroup" aria-label="Bits aleatorios">
            <button
              v-for="bits in BIT_OPTIONS"
              :key="bits"
              type="button"
              role="radio"
              class="chip"
              :class="{ active: options.bits === bits }"
              :aria-checked="options.bits === bits"
              @click="selectBits(bits)"
            >
              {{ bits }} bits
            </button>
          </div>
        </div>

        <div v-if="usesCharacters" class="field">
          <span class="label">Caracteres</span>
          <div class="segmented">
            <button
              v-for="option in CHARACTER_SET_OPTIONS"
              :key="option.id"
              type="button"
              class="chip"
              :class="{ active: isEnabled(option.id) }"
              :aria-pressed="isEnabled(option.id)"
              :aria-label="option.label"
              :title="option.label"
              @click="toggleCharacterSet(option.id)"
            >
              {{ option.example === '!@#' ? symbolsExample : option.example }}
            </button>
          </div>

          <div class="checks">
            <label title="Solo símbolos - _ . ~ : no rompen URLs ni archivos .env">
              <input v-model="options.urlSafe" type="checkbox" @change="markCustom" />
              URL-safe
            </label>
            <label title="Quita 0 O 1 l I">
              <input v-model="options.excludeAmbiguous" type="checkbox" @change="markCustom" />
              Sin ambiguos
            </label>
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="key-prefix">Prefijo</label>
            <input
              id="key-prefix"
              v-model.trim="options.prefix"
              class="text-input"
              type="text"
              placeholder="sk_live_"
              spellcheck="false"
              autocomplete="off"
              :maxlength="MAX_PREFIX_LENGTH"
              :aria-invalid="Boolean(prefixError)"
              :aria-describedby="prefixError ? 'prefix-error' : undefined"
              @input="markCustom"
            />
            <small v-if="prefixError" id="prefix-error" class="error">{{ prefixError }}</small>
          </div>

          <div class="field">
            <label for="key-count">Cantidad</label>
            <input
              id="key-count"
              v-model.number="count"
              class="text-input"
              type="number"
              inputmode="numeric"
              min="1"
              :max="MAX_COUNT"
              @change="clampCount"
            />
          </div>
        </div>

        <button type="button" class="primary" @click="createKeys()">
          <RefreshCw />
          {{ count > 1 ? `Generar ${count} claves` : 'Generar' }}
        </button>
      </div>

      <div class="result">
        <div class="result-header">
          <span>{{ isBatch ? `${generatedKeys.length} claves` : 'Tu clave' }}</span>
          <span v-if="primaryKey" class="strength">
            {{ strengthLabel }} · {{ primaryKey.entropy }} bits
          </span>
        </div>

        <div v-if="!isBatch" class="key-output">
          <code>{{ mask(primaryKey?.value ?? '') }}</code>
          <button
            type="button"
            class="icon-button"
            :aria-label="isVisible ? 'Ocultar clave' : 'Mostrar clave'"
            @click="isVisible = !isVisible"
          >
            <EyeOff v-if="isVisible" />
            <Eye v-else />
          </button>
        </div>

        <ol v-else class="key-list">
          <li v-for="key in generatedKeys" :key="key.id">
            <code>{{ mask(key.value) }}</code>
            <button
              type="button"
              class="icon-button"
              aria-label="Copiar clave"
              @click="copyKey(key.value)"
            >
              <Copy />
            </button>
          </li>
        </ol>

        <div v-if="!isBatch && primaryHash" class="hash-row">
          <span title="Guarda el hash en tu base de datos, no la clave">SHA-256</span>
          <code>{{ primaryHash }}</code>
          <button
            type="button"
            class="icon-button"
            aria-label="Copiar hash SHA-256"
            @click="copyHash"
          >
            <Copy />
          </button>
        </div>

        <div class="actions">
          <template v-if="!isBatch">
            <button type="button" class="primary" @click="copyKey()">
              <Copy />
              Copiar
            </button>
            <button type="button" class="secondary" @click="downloadKey">
              <Download />
              .txt
            </button>
          </template>

          <template v-else>
            <button type="button" class="primary" @click="copyAll">
              <Copy />
              Copiar
            </button>
            <button
              v-for="(meta, format) in EXPORT_FORMATS"
              :key="format"
              type="button"
              class="secondary"
              @click="exportKeys(format)"
            >
              {{ meta.label }}
            </button>
            <button
              type="button"
              class="icon-button"
              :aria-label="isVisible ? 'Ocultar claves' : 'Mostrar claves'"
              @click="isVisible = !isVisible"
            >
              <EyeOff v-if="isVisible" />
              <Eye v-else />
            </button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.generator {
  display: grid;
  gap: 28px;
}

.hero h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.hero p {
  margin: 12px 0 0;
  color: var(--color-muted);
  font-size: 0.95rem;
}

.preset-bar,
.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 7px 13px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  background: transparent;
  font-size: 0.8rem;
  font-weight: 550;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.chip:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.chip.active {
  border-color: var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
  overflow: hidden;
}

.controls,
.result {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: clamp(22px, 4vw, 32px);
}

.controls {
  border-right: 1px solid var(--color-border);
}

.field {
  display: grid;
  gap: 10px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field label,
.label {
  color: var(--color-text);
  font-size: 0.82rem;
  font-weight: 600;
}

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 12px;
}

.stepper {
  display: grid;
  grid-template-columns: 30px 48px 30px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  overflow: hidden;
}

.stepper button,
.stepper input {
  height: 100%;
  border: 0;
  color: var(--color-text);
  background: transparent;
}

.stepper button {
  display: grid;
  place-items: center;
  cursor: pointer;
}

.stepper button:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.stepper :deep(svg) {
  width: 13px;
  height: 13px;
}

.stepper input {
  width: 100%;
  outline: none;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  appearance: textfield;
}

.stepper input::-webkit-inner-spin-button,
.stepper input::-webkit-outer-spin-button,
.text-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.range {
  width: 100%;
  height: 4px;
  appearance: none;
  border-radius: 999px;
  background: var(--color-border-strong);
  accent-color: var(--color-inverse);
  cursor: pointer;
}

.range::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  appearance: none;
  border: 3px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-inverse);
  box-shadow: 0 0 0 1px var(--color-border-strong);
}

.range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 3px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-inverse);
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 4px;
}

.checks label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}

.checks input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--color-inverse);
}

.text-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text);
  background: var(--color-background);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.8rem;
  appearance: textfield;
}

.text-input[aria-invalid='true'] {
  border-color: #d93636;
}

.error {
  color: #d93636;
  font-size: 0.72rem;
}

.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 150ms ease,
    background-color 150ms ease;
}

.primary {
  border: 1px solid var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.primary:hover {
  opacity: 0.85;
}

.secondary {
  border: 1px solid var(--color-border-strong);
  color: var(--color-text);
  background: transparent;
}

.secondary:hover {
  background: var(--color-surface-hover);
}

.primary :deep(svg),
.secondary :deep(svg) {
  width: 15px;
  height: 15px;
}

.controls > .primary {
  margin-top: auto;
}

.result {
  background: var(--color-background);
}

.result-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-size: 0.82rem;
  font-weight: 600;
}

.strength {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 500;
}

.key-output {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: start;
  gap: 12px;
  min-height: 120px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

code {
  min-width: 0;
  color: var(--color-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}

.key-output code {
  font-size: 0.85rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.icon-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  color: var(--color-muted);
  background: transparent;
  cursor: pointer;
}

.icon-button:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.icon-button :deep(svg) {
  width: 15px;
  height: 15px;
}

.key-list {
  max-height: 300px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.key-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 2px 10px;
  border-radius: 8px;
}

.key-list li:hover {
  background: var(--color-surface-hover);
}

.key-list code,
.hash-row code {
  overflow: hidden;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hash-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 32px;
  align-items: center;
  gap: 10px;
  margin-top: -12px;
  color: var(--color-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.hash-row code {
  color: var(--color-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.actions .primary {
  flex: 1 1 120px;
}

@media (max-width: 760px) {
  .panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .controls {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .actions .primary {
    flex-basis: 100%;
  }

  .actions .secondary {
    flex: 1;
  }
}
</style>
