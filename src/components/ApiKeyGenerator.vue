<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
} from '@lucide/vue'
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
    <header class="generator-heading">
      <div>
        <span class="eyebrow">API KEY GENERATOR</span>
        <h1 id="generator-title">Genera una clave segura.</h1>
        <p>Elige un formato o personaliza la tuya. Todo se genera en tu navegador.</p>
      </div>

      <span class="local-pill">
        <ShieldCheck />
        Local
      </span>
    </header>

    <div class="preset-bar" role="radiogroup" aria-label="Formato de la clave">
      <button
        v-for="preset in KEY_PRESETS"
        :key="preset.id"
        type="button"
        role="radio"
        class="preset-chip"
        :class="{ active: activePresetId === preset.id }"
        :aria-checked="activePresetId === preset.id"
        :title="preset.description"
        @click="applyPreset(preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div class="generator-grid">
      <div class="controls-panel">
        <div v-if="usesCharacters" class="control-block">
          <div class="control-heading">
            <div>
              <label for="key-length">Longitud</label>
              <span>Entre {{ MIN_LENGTH }} y {{ MAX_LENGTH }} caracteres</span>
            </div>

            <div class="length-stepper">
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
                aria-label="Cantidad de caracteres"
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
            class="length-range"
            type="range"
            :min="MIN_LENGTH"
            :max="MAX_LENGTH"
            aria-label="Longitud de la API key"
            @input="markCustom"
          />
        </div>

        <div v-if="usesBits" class="control-block">
          <div class="control-heading compact">
            <div>
              <span class="control-label">Tamaño</span>
              <span>Bits aleatorios de la clave</span>
            </div>
          </div>

          <div class="segmented" role="radiogroup" aria-label="Bits aleatorios">
            <button
              v-for="bits in BIT_OPTIONS"
              :key="bits"
              type="button"
              role="radio"
              :class="{ active: options.bits === bits }"
              :aria-checked="options.bits === bits"
              @click="selectBits(bits)"
            >
              {{ bits }} bits
            </button>
          </div>
        </div>

        <div v-if="usesCharacters" class="control-block">
          <div class="control-heading compact">
            <div>
              <span class="control-label">Caracteres</span>
              <span>Selecciona al menos una opción</span>
            </div>
          </div>

          <div class="character-grid">
            <button
              v-for="option in CHARACTER_SET_OPTIONS"
              :key="option.id"
              type="button"
              class="character-option"
              :class="{ active: isEnabled(option.id) }"
              :aria-pressed="isEnabled(option.id)"
              @click="toggleCharacterSet(option.id)"
            >
              <span class="checkbox" aria-hidden="true">
                <Check v-if="isEnabled(option.id)" />
              </span>

              <span class="option-copy">
                <strong>{{ option.label }}</strong>
                <small>{{ option.id === 'symbols' ? symbolsExample : option.example }}</small>
              </span>
            </button>
          </div>

          <div class="toggle-list">
            <label class="toggle">
              <input v-model="options.urlSafe" type="checkbox" @change="markCustom" />
              <span>
                <strong>URL-safe</strong>
                <small>Símbolos solo <code>- _ . ~</code>: no rompen URLs ni archivos .env</small>
              </span>
            </label>

            <label class="toggle">
              <input v-model="options.excludeAmbiguous" type="checkbox" @change="markCustom" />
              <span>
                <strong>Sin caracteres ambiguos</strong>
                <small>Quita <code>0 O 1 l I</code> para dictarla o leerla sin errores</small>
              </span>
            </label>
          </div>
        </div>

        <div class="control-row">
          <div class="field">
            <label for="key-prefix">Prefijo</label>
            <input
              id="key-prefix"
              v-model.trim="options.prefix"
              type="text"
              placeholder="sk_live_"
              spellcheck="false"
              autocomplete="off"
              :maxlength="MAX_PREFIX_LENGTH"
              :aria-invalid="Boolean(prefixError)"
              aria-describedby="prefix-hint"
              @input="markCustom"
            />
            <small id="prefix-hint" :class="{ error: prefixError }">
              {{ prefixError ?? 'Opcional. Identifica el tipo o entorno de la clave.' }}
            </small>
          </div>

          <div class="field count-field">
            <label for="key-count">Cantidad</label>
            <input
              id="key-count"
              v-model.number="count"
              type="number"
              inputmode="numeric"
              min="1"
              :max="MAX_COUNT"
              @change="clampCount"
            />
            <small>Hasta {{ MAX_COUNT }}</small>
          </div>
        </div>

        <button type="button" class="generate-button" @click="createKeys()">
          <RefreshCw />
          {{ count > 1 ? `Generar ${count} claves` : 'Generar nueva clave' }}
        </button>
      </div>

      <div class="result-panel">
        <div class="result-header">
          <span>{{ isBatch ? `Tus ${generatedKeys.length} claves` : 'Tu API key' }}</span>
          <span v-if="primaryKey" class="strength">
            <span class="strength-dot"></span>
            {{ strengthLabel }} · {{ primaryKey.entropy }} bits
          </span>
        </div>

        <div v-if="!isBatch" class="key-output">
          <KeyRound class="key-icon" aria-hidden="true" />
          <code>{{ mask(primaryKey?.value ?? '') }}</code>

          <button
            type="button"
            class="visibility-button"
            :aria-label="isVisible ? 'Ocultar API key' : 'Mostrar API key'"
            @click="isVisible = !isVisible"
          >
            <EyeOff v-if="isVisible" />
            <Eye v-else />
          </button>
        </div>

        <ol v-else class="key-list">
          <li v-for="key in generatedKeys" :key="key.id">
            <code>{{ mask(key.value) }}</code>
            <button type="button" :aria-label="`Copiar clave`" @click="copyKey(key.value)">
              <Copy />
            </button>
          </li>
        </ol>

        <div class="result-meta">
          <span>{{ primaryKey?.length ?? options.length }} caracteres</span>
          <span>{{ primaryKey ? describe(primaryKey) : '' }}</span>
        </div>

        <div v-if="!isBatch && primaryHash" class="hash-row">
          <Fingerprint aria-hidden="true" />
          <div>
            <span>SHA-256 · guarda esto en tu base de datos, no la clave</span>
            <code>{{ primaryHash }}</code>
          </div>
          <button type="button" aria-label="Copiar hash SHA-256" @click="copyHash">
            <Copy />
          </button>
        </div>

        <div v-if="!isBatch" class="result-actions">
          <button type="button" class="copy-button" @click="copyKey()">
            <Copy />
            Copiar
          </button>

          <button type="button" class="download-button" @click="downloadKey">
            <Download />
            Descargar
          </button>
        </div>

        <div v-else class="result-actions batch-actions">
          <button type="button" class="copy-button" @click="copyAll">
            <Copy />
            Copiar todas
          </button>

          <div class="export-group" role="group" aria-label="Exportar claves">
            <button
              v-for="(meta, format) in EXPORT_FORMATS"
              :key="format"
              type="button"
              class="download-button"
              @click="exportKeys(format)"
            >
              <Download />
              {{ meta.label }}
            </button>
          </div>

          <button type="button" class="visibility-toggle" @click="isVisible = !isVisible">
            <EyeOff v-if="isVisible" />
            <Eye v-else />
            {{ isVisible ? 'Ocultar' : 'Mostrar' }}
          </button>
        </div>

        <p class="privacy-note">
          No guardamos ni enviamos estas claves. Cópialas antes de cerrar la página.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.generator {
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.generator-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
  padding: clamp(28px, 5vw, 48px);
  border-bottom: 1px solid var(--color-border);
}

.eyebrow {
  display: block;
  margin-bottom: 14px;
  color: var(--color-muted);
  font-size: 0.67rem;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.generator-heading h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 680;
  line-height: 1;
  letter-spacing: -0.06em;
}

.generator-heading p {
  max-width: 570px;
  margin: 18px 0 0;
  color: var(--color-muted);
  font-size: 0.92rem;
  line-height: 1.65;
}

.local-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 650;
}

.local-pill :deep(svg) {
  width: 14px;
  height: 14px;
}

.generator-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.controls-panel,
.result-panel {
  padding: clamp(26px, 4vw, 40px);
}

.controls-panel {
  border-right: 1px solid var(--color-border);
}

.control-block + .control-block {
  margin-top: 30px;
}

.control-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.control-heading.compact {
  margin-bottom: 12px;
}

.control-heading > div:first-child {
  display: grid;
  gap: 5px;
}

.control-heading label,
.control-label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 680;
}

.control-heading span:not(.control-label) {
  color: var(--color-muted);
  font-size: 0.7rem;
}

.length-stepper {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 34px 58px 34px;
  align-items: center;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-background);
}

.length-stepper button,
.length-stepper input {
  height: 100%;
  border: 0;
  color: var(--color-text);
  background: transparent;
}

.length-stepper button {
  display: grid;
  place-items: center;
  cursor: pointer;
}

.length-stepper button:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.length-stepper button :deep(svg) {
  width: 14px;
  height: 14px;
}

.length-stepper input {
  width: 100%;
  border-right: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
  outline: none;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 650;
  appearance: textfield;
}

.length-stepper input::-webkit-inner-spin-button,
.length-stepper input::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.length-range {
  width: 100%;
  height: 4px;
  appearance: none;
  border-radius: 999px;
  background: var(--color-border-strong);
  cursor: pointer;
  accent-color: var(--color-inverse);
}

.length-range::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  appearance: none;
  border: 4px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-inverse);
  box-shadow: 0 0 0 1px var(--color-border-strong);
}

.length-range::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border: 4px solid var(--color-surface);
  border-radius: 50%;
  background: var(--color-inverse);
  box-shadow: 0 0 0 1px var(--color-border-strong);
}

.character-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.character-option {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  color: var(--color-text);
  background: var(--color-background);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}

.character-option:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.character-option.active {
  border-color: var(--color-text);
}

.checkbox {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  color: var(--color-inverse-text);
  background: transparent;
}

.character-option.active .checkbox {
  border-color: var(--color-inverse);
  background: var(--color-inverse);
}

.checkbox :deep(svg) {
  width: 12px;
  height: 12px;
  stroke-width: 3;
}

.option-copy {
  display: grid;
  gap: 2px;
}

.option-copy strong {
  font-size: 0.77rem;
  font-weight: 650;
}

.option-copy small {
  color: var(--color-muted);
  font-size: 0.66rem;
}

.generate-button,
.copy-button,
.download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border-radius: 12px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 680;
  cursor: pointer;
  transition:
    transform 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.generate-button {
  width: 100%;
  margin-top: 28px;
  border: 1px solid var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.generate-button:hover,
.copy-button:hover,
.download-button:hover {
  transform: translateY(-1px);
}

.generate-button :deep(svg),
.copy-button :deep(svg),
.download-button :deep(svg) {
  width: 16px;
  height: 16px;
}

.result-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  color: var(--color-text);
  font-size: 0.78rem;
  font-weight: 680;
}

.strength {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: 0.64rem;
  font-weight: 550;
}

.strength-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text);
}

.key-output {
  min-height: 184px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 34px;
  align-items: start;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
}

.key-icon {
  width: 18px;
  height: 18px;
  margin-top: 4px;
  color: var(--color-muted);
}

.key-output code {
  min-width: 0;
  color: var(--color-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.visibility-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-muted);
  background: var(--color-background);
  cursor: pointer;
}

.visibility-button:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.visibility-button :deep(svg) {
  width: 15px;
  height: 15px;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin: 12px 2px 0;
  color: var(--color-muted);
  font-size: 0.65rem;
}

.result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
  padding-top: 28px;
}

.copy-button {
  border: 1px solid var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.download-button {
  border: 1px solid var(--color-border-strong);
  color: var(--color-text);
  background: var(--color-surface);
}

.download-button:hover {
  background: var(--color-surface-hover);
}

.privacy-note {
  margin: 15px 0 0;
  color: var(--color-muted);
  font-size: 0.64rem;
  line-height: 1.5;
  text-align: center;
}

.preset-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 18px clamp(26px, 4vw, 40px);
  border-bottom: 1px solid var(--color-border);
}

.preset-chip {
  padding: 8px 13px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  background: var(--color-background);
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease,
    background-color 150ms ease;
}

.preset-chip:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.preset-chip.active {
  border-color: var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.segmented button {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  background: var(--color-background);
  font-size: 0.77rem;
  font-weight: 650;
  cursor: pointer;
}

.segmented button:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

.segmented button.active {
  border-color: var(--color-inverse);
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.toggle-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.toggle {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  background: var(--color-background);
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--color-border-strong);
}

.toggle input {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--color-inverse);
}

.toggle span {
  display: grid;
  gap: 3px;
}

.toggle strong {
  font-size: 0.77rem;
  font-weight: 650;
}

.toggle small,
.field small {
  color: var(--color-muted);
  font-size: 0.66rem;
  line-height: 1.45;
}

.toggle code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}

.control-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 10px;
  margin-top: 30px;
}

.field {
  display: grid;
  gap: 6px;
  align-content: start;
}

.field label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 680;
}

.field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text);
  background: var(--color-background);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.8rem;
}

.field input[aria-invalid='true'] {
  border-color: #d93636;
}

.field small.error {
  color: #d93636;
}

.key-list {
  max-height: 320px;
  margin: 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  counter-reset: key;
}

.key-list li {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 10px;
  counter-increment: key;
}

.key-list li::before {
  content: counter(key);
  color: var(--color-muted);
  font-size: 0.62rem;
  text-align: right;
}

.key-list li:hover {
  background: var(--color-surface-hover);
}

.key-list code,
.hash-row code {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-list button,
.hash-row button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-muted);
  background: var(--color-background);
  cursor: pointer;
}

.key-list button:hover,
.hash-row button:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.key-list :deep(svg),
.hash-row button :deep(svg) {
  width: 13px;
  height: 13px;
}

.hash-row {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border-strong);
  border-radius: 12px;
}

.hash-row > :deep(svg) {
  width: 16px;
  height: 16px;
  color: var(--color-muted);
}

.hash-row div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.hash-row span {
  color: var(--color-muted);
  font-size: 0.62rem;
}

.batch-actions {
  grid-template-columns: 1fr;
}

.export-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.visibility-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  border: 0;
  color: var(--color-muted);
  background: transparent;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.visibility-toggle:hover {
  color: var(--color-text);
}

.visibility-toggle :deep(svg) {
  width: 14px;
  height: 14px;
}

@media (max-width: 760px) {
  .generator-grid {
    grid-template-columns: 1fr;
  }

  .controls-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .result-panel {
    min-height: 420px;
  }
}

@media (max-width: 520px) {
  .generator {
    border-radius: 20px;
  }

  .generator-heading {
    flex-direction: column;
    gap: 18px;
  }

  .local-pill {
    align-self: flex-start;
  }

  .control-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .length-stepper {
    align-self: stretch;
    grid-template-columns: 40px 1fr 40px;
  }

  .character-grid,
  .result-actions,
  .control-row {
    grid-template-columns: 1fr;
  }

  .key-output {
    min-height: 160px;
  }

  .result-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
