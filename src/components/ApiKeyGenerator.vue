<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
} from '@lucide/vue'
import { toast } from 'vue-sonner'

import type { CharacterSetId, GeneratedApiKey } from '@/types/api-key'
import {
  CHARACTER_SET_OPTIONS,
  generateApiKey,
  getDownloadFilename,
} from '@/utils/api-key'

const MIN_LENGTH = 8
const MAX_LENGTH = 128

const length = ref(32)
const enabledCharacterSets = ref<Record<CharacterSetId, boolean>>({
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: false,
})
const generatedKey = ref<GeneratedApiKey | null>(null)
const isVisible = ref(true)

const selectedCharacterSets = computed<CharacterSetId[]>(() => {
  return CHARACTER_SET_OPTIONS.filter((option) => enabledCharacterSets.value[option.id]).map(
    (option) => option.id,
  )
})

const displayedKey = computed(() => {
  const key = generatedKey.value?.value ?? ''
  return isVisible.value ? key : '•'.repeat(key.length)
})

const strengthLabel = computed(() => {
  const entropy = generatedKey.value?.entropy ?? 0

  if (entropy >= 180) {
    return 'Muy fuerte'
  }

  if (entropy >= 100) {
    return 'Fuerte'
  }

  if (entropy >= 60) {
    return 'Buena'
  }

  return 'Básica'
})

function clampLength(): void {
  const parsedLength = Number(length.value)
  length.value = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(parsedLength || MIN_LENGTH)))
}

function adjustLength(amount: number): void {
  length.value = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, length.value + amount))
}

function toggleCharacterSet(id: CharacterSetId): void {
  const isEnabled = enabledCharacterSets.value[id]

  if (isEnabled && selectedCharacterSets.value.length === 1) {
    toast.error('Selecciona al menos un tipo de carácter')
    return
  }

  enabledCharacterSets.value[id] = !isEnabled
}

function createKey(showNotification = true): void {
  clampLength()

  try {
    generatedKey.value = generateApiKey({
      length: length.value,
      characterSets: selectedCharacterSets.value,
    })
    isVisible.value = true

    if (showNotification) {
      toast.success('Nueva API key generada')
    }
  } catch {
    toast.error('No fue posible generar la API key')
  }
}

async function copyKey(): Promise<void> {
  const key = generatedKey.value?.value

  if (!key) {
    toast.error('Primero genera una API key')
    return
  }

  try {
    await navigator.clipboard.writeText(key)
    toast.success('API key copiada')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = key
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    const copied = document.execCommand('copy')
    textarea.remove()

    if (copied) {
      toast.success('API key copiada')
    } else {
      toast.error('No fue posible copiarla')
    }
  }
}

function downloadKey(): void {
  const key = generatedKey.value

  if (!key) {
    toast.error('Primero genera una API key')
    return
  }

  const activeOptions = CHARACTER_SET_OPTIONS.filter((option) =>
    key.characterSets.includes(option.id),
  )
    .map((option) => option.label)
    .join(', ')

  const content = [
    'API KEY',
    '=======',
    '',
    key.value,
    '',
    `Longitud: ${key.length} caracteres`,
    `Incluye: ${activeOptions}`,
    `Entropía estimada: ${key.entropy} bits`,
    `Generada: ${key.createdAt.toLocaleString('es-GT')}`,
    '',
    'Guarda esta clave en un lugar seguro.',
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = getDownloadFilename(key)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)

  toast.success('API key descargada')
}

onMounted(() => createKey(false))
</script>

<template>
  <section class="generator" aria-labelledby="generator-title">
    <header class="generator-heading">
      <div>
        <span class="eyebrow">API KEY GENERATOR</span>
        <h1 id="generator-title">Genera una clave segura.</h1>
        <p>Elige la longitud y los caracteres. Todo se genera en tu navegador.</p>
      </div>

      <span class="local-pill">
        <ShieldCheck />
        Local
      </span>
    </header>

    <div class="generator-grid">
      <div class="controls-panel">
        <div class="control-block">
          <div class="control-heading">
            <div>
              <label for="key-length">Longitud</label>
              <span>Entre {{ MIN_LENGTH }} y {{ MAX_LENGTH }} caracteres</span>
            </div>

            <div class="length-stepper">
              <button
                type="button"
                aria-label="Reducir longitud"
                :disabled="length <= MIN_LENGTH"
                @click="adjustLength(-1)"
              >
                <Minus />
              </button>

              <input
                id="key-length"
                v-model.number="length"
                type="number"
                inputmode="numeric"
                :min="MIN_LENGTH"
                :max="MAX_LENGTH"
                aria-label="Cantidad de caracteres"
                @change="clampLength"
              />

              <button
                type="button"
                aria-label="Aumentar longitud"
                :disabled="length >= MAX_LENGTH"
                @click="adjustLength(1)"
              >
                <Plus />
              </button>
            </div>
          </div>

          <input
            v-model.number="length"
            class="length-range"
            type="range"
            :min="MIN_LENGTH"
            :max="MAX_LENGTH"
            aria-label="Longitud de la API key"
          />
        </div>

        <div class="control-block">
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
              :class="{ active: enabledCharacterSets[option.id] }"
              :aria-pressed="enabledCharacterSets[option.id]"
              @click="toggleCharacterSet(option.id)"
            >
              <span class="checkbox" aria-hidden="true">
                <Check v-if="enabledCharacterSets[option.id]" />
              </span>

              <span class="option-copy">
                <strong>{{ option.label }}</strong>
                <small>{{ option.example }}</small>
              </span>
            </button>
          </div>
        </div>

        <button type="button" class="generate-button" @click="createKey()">
          <RefreshCw />
          Generar nueva clave
        </button>
      </div>

      <div class="result-panel">
        <div class="result-header">
          <span>Tu API key</span>
          <span v-if="generatedKey" class="strength">
            <span class="strength-dot"></span>
            {{ strengthLabel }} · {{ generatedKey.entropy }} bits
          </span>
        </div>

        <div class="key-output">
          <KeyRound class="key-icon" aria-hidden="true" />
          <code>{{ displayedKey }}</code>

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

        <div class="result-meta">
          <span>{{ generatedKey?.length ?? length }} caracteres</span>
          <span>{{ selectedCharacterSets.length }} tipos seleccionados</span>
        </div>

        <div class="result-actions">
          <button type="button" class="copy-button" @click="copyKey">
            <Copy />
            Copiar
          </button>

          <button type="button" class="download-button" @click="downloadKey">
            <Download />
            Descargar
          </button>
        </div>

        <p class="privacy-note">
          No guardamos ni enviamos esta clave. Cópiala antes de cerrar la página.
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
  .result-actions {
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
