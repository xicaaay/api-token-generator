<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref } from 'vue'
import {
  Check,
  CircleDot,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeySquare,
  LockKeyhole,
  Ruler,
  ShieldCheck,
  Sparkles,
  Tag,
  WandSparkles,
} from '@lucide/vue'
import { toast } from 'vue-sonner'

import type { ComplexityLevel, GeneratedApiKey } from '@/types/api-key'
import {
  COMPLEXITY_OPTIONS,
  generateApiKey,
  getDownloadFilename,
  sanitizePrefix,
} from '@/utils/api-key'

const MIN_LENGTH = 16
const MAX_LENGTH = 128

const complexityIcons: Record<ComplexityLevel, Component> = {
  simple: CircleDot,
  standard: ShieldCheck,
  advanced: Sparkles,
}

const prefix = ref('ak_live')
const length = ref(48)
const complexity = ref<ComplexityLevel>('standard')
const generatedKey = ref<GeneratedApiKey | null>(null)
const isVisible = ref(true)

const selectedComplexity = computed(() => {
  return COMPLEXITY_OPTIONS.find((option) => option.id === complexity.value)
})

const displayedKey = computed(() => {
  const key = generatedKey.value?.value

  if (!key) {
    return ''
  }

  if (isVisible.value) {
    return key
  }

  const visibleEnding = key.slice(-6)
  const hiddenLength = Math.max(key.length - visibleEnding.length, 12)

  return `${'•'.repeat(hiddenLength)}${visibleEnding}`
})

const strengthLabel = computed(() => {
  const entropy = generatedKey.value?.entropy ?? 0

  if (entropy >= 256) {
    return 'Muy alta'
  }

  if (entropy >= 160) {
    return 'Alta'
  }

  return 'Sólida'
})

const lengthProgress = computed(() => {
  return ((length.value - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH)) * 100
})

const strengthPercentage = computed(() => {
  const entropy = generatedKey.value?.entropy ?? 0
  return Math.min(Math.round((entropy / 300) * 100), 100)
})

function handlePrefixInput(event: Event): void {
  const target = event.target as HTMLInputElement
  prefix.value = sanitizePrefix(target.value)
}

function selectComplexity(value: ComplexityLevel): void {
  complexity.value = value
}

function createKey(): void {
  try {
    generatedKey.value = generateApiKey({
      prefix: prefix.value,
      length: length.value,
      complexity: complexity.value,
    })
    isVisible.value = true
    toast.success('API key generada correctamente')
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
    toast.success('API key copiada al portapapeles')
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
      toast.success('API key copiada al portapapeles')
      return
    }

    toast.error('No fue posible copiar la API key')
  }
}

function downloadKey(): void {
  const key = generatedKey.value

  if (!key) {
    toast.error('Primero genera una API key')
    return
  }

  const details = [
    'API KEY FACTORY',
    '================',
    '',
    `API key: ${key.value}`,
    `Complejidad: ${selectedComplexity.value?.label ?? key.complexity}`,
    `Longitud aleatoria: ${key.randomLength} caracteres`,
    `Entropía estimada: ${key.entropy} bits`,
    `Generada: ${key.createdAt.toLocaleString('es-GT')}`,
    '',
    'Guarda este archivo en un lugar seguro y evita compartirlo.',
  ].join('\n')

  const blob = new Blob([details], { type: 'text/plain;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = getDownloadFilename(key)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)

  toast.success('Archivo descargado')
}
</script>

<template>
  <section class="generator-card" aria-labelledby="generator-title">
    <div class="settings-panel">
      <div class="panel-heading">
        <span class="step-label">CONFIGURACIÓN</span>
        <h2 id="generator-title">Diseña tu API key</h2>
        <p>Selecciona el nivel de complejidad y la longitud que necesitas.</p>
      </div>

      <div class="control-group">
        <div class="label-row">
          <label>Complejidad</label>
          <span>{{ selectedComplexity?.label }}</span>
        </div>

        <div class="complexity-grid" role="radiogroup" aria-label="Complejidad de la API key">
          <button
            v-for="option in COMPLEXITY_OPTIONS"
            :key="option.id"
            type="button"
            class="complexity-option"
            :class="{ active: complexity === option.id }"
            :aria-checked="complexity === option.id"
            role="radio"
            @click="selectComplexity(option.id)"
          >
            <span class="option-icon">
              <component :is="complexityIcons[option.id]" />
            </span>

            <span class="option-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>

            <span class="option-check" aria-hidden="true">
              <Check v-if="complexity === option.id" />
            </span>
          </button>
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <label for="key-length">Longitud segura</label>
          <output for="key-length">{{ length }} caracteres</output>
        </div>

        <input
          id="key-length"
          v-model.number="length"
          class="length-range"
          type="range"
          :min="MIN_LENGTH"
          :max="MAX_LENGTH"
          step="8"
          :style="{ '--range-progress': `${lengthProgress}%` }"
        />

        <div class="range-labels" aria-hidden="true">
          <span>{{ MIN_LENGTH }}</span>
          <span>{{ MAX_LENGTH }}</span>
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <label for="key-prefix">Prefijo opcional</label>
          <span>Máx. 18 caracteres</span>
        </div>

        <div class="prefix-input">
          <Tag />
          <input
            id="key-prefix"
            :value="prefix"
            type="text"
            maxlength="18"
            placeholder="ak_live"
            autocomplete="off"
            spellcheck="false"
            @input="handlePrefixInput"
          />
        </div>
      </div>

      <button type="button" class="generate-button" @click="createKey">
        <WandSparkles />
        {{ generatedKey ? 'Generar una nueva key' : 'Generar API key' }}
      </button>
    </div>

    <div class="result-panel">
      <div class="result-heading">
        <div>
          <span class="step-label">RESULTADO</span>
          <h2>Tu clave segura</h2>
        </div>

        <span v-if="generatedKey" class="strength-badge">
          <ShieldCheck />
          {{ strengthLabel }}
        </span>
      </div>

      <div v-if="generatedKey" class="generated-result">
        <div class="key-output">
          <code>{{ displayedKey }}</code>

          <button
            type="button"
            class="icon-button"
            :aria-label="isVisible ? 'Ocultar API key' : 'Mostrar API key'"
            @click="isVisible = !isVisible"
          >
            <EyeOff v-if="isVisible" />
            <Eye v-else />
          </button>
        </div>

        <div class="strength-block">
          <div class="strength-copy">
            <span>Entropía estimada</span>
            <strong>{{ generatedKey.entropy }} bits</strong>
          </div>

          <div class="strength-track" aria-hidden="true">
            <span :style="{ width: `${strengthPercentage}%` }"></span>
          </div>
        </div>

        <div class="key-metadata">
          <span>
            <Ruler />
            {{ generatedKey.totalLength }} caracteres totales
          </span>
          <span>
            <Clock3 />
            Generada ahora
          </span>
        </div>

        <div class="result-actions">
          <button type="button" class="primary-action" @click="copyKey">
            <Copy />
            Copiar
          </button>

          <button type="button" class="secondary-action" @click="downloadKey">
            <Download />
            Descargar .txt
          </button>
        </div>

        <div class="security-note">
          <LockKeyhole />
          <p>
            Esta clave se genera únicamente en tu navegador. No se guarda ni se envía a ningún
            servidor.
          </p>
        </div>
      </div>

      <div v-else class="empty-result">
        <span class="empty-icon">
          <KeySquare />
        </span>
        <h3>Aún no hay una clave</h3>
        <p>Configura las opciones y genera una API key para verla aquí.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.generator-card {
  display: grid;
  grid-template-columns: minmax(0, 1.03fr) minmax(0, 0.97fr);
  border: 1px solid var(--color-border);
  border-radius: 28px;
  overflow: hidden;
  background: rgba(16, 27, 38, 0.74);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(22px);
}

.settings-panel,
.result-panel {
  padding: clamp(28px, 4vw, 48px);
}

.settings-panel {
  border-right: 1px solid var(--color-border);
}

.result-panel {
  position: relative;
  min-height: 620px;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 85% 10%, rgba(68, 166, 241, 0.13), transparent 35%),
    linear-gradient(145deg, rgba(9, 14, 20, 0.64), rgba(20, 34, 47, 0.82));
}

.panel-heading,
.result-heading {
  margin-bottom: 34px;
}

.panel-heading h2,
.result-heading h2 {
  margin: 10px 0 9px;
  color: var(--color-text-primary);
  font-size: clamp(1.55rem, 2.4vw, 2rem);
  font-weight: 760;
  letter-spacing: -0.045em;
}

.panel-heading p {
  max-width: 480px;
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.step-label {
  color: var(--color-blue-light);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.19em;
}

.control-group {
  margin-bottom: 29px;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
}

.label-row label {
  color: var(--color-text-primary);
  font-size: 0.88rem;
  font-weight: 680;
}

.label-row span,
.label-row output {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.complexity-grid {
  display: grid;
  gap: 9px;
}

.complexity-option {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 26px;
  align-items: center;
  gap: 13px;
  padding: 13px 14px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  color: inherit;
  background: rgba(255, 255, 255, 0.018);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.complexity-option:hover {
  border-color: rgba(68, 166, 241, 0.4);
  transform: translateY(-1px);
}

.complexity-option.active {
  border-color: rgba(68, 166, 241, 0.68);
  background: linear-gradient(90deg, rgba(68, 70, 241, 0.12), rgba(68, 166, 241, 0.055));
}

.option-icon,
.option-check {
  display: grid;
  place-items: center;
}

.option-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  color: var(--color-blue-light);
  background: rgba(68, 166, 241, 0.09);
}

.option-icon :deep(svg) {
  width: 19px;
  height: 19px;
}

.option-copy {
  display: grid;
  gap: 3px;
}

.option-copy strong {
  color: var(--color-text-primary);
  font-size: 0.88rem;
  font-weight: 680;
}

.option-copy small {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}

.option-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #07131e;
  background: var(--color-blue-light);
}

.option-check :deep(svg) {
  width: 13px;
  height: 13px;
  stroke-width: 3;
}

.length-range {
  width: 100%;
  height: 6px;
  appearance: none;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--color-blue-primary) 0%,
    var(--color-blue-light) var(--range-progress, 30%),
    var(--color-surface-soft) var(--range-progress, 30%),
    var(--color-surface-soft) 100%
  );
  cursor: pointer;
  accent-color: var(--color-blue-light);
}

.length-range::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  border: 4px solid #e8f4ff;
  border-radius: 50%;
  background: var(--color-blue-primary);
  box-shadow: 0 0 0 5px rgba(68, 166, 241, 0.12);
}

.length-range::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 4px solid #e8f4ff;
  border-radius: 50%;
  background: var(--color-blue-primary);
  box-shadow: 0 0 0 5px rgba(68, 166, 241, 0.12);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  color: var(--color-text-muted);
  font-size: 0.68rem;
}

.prefix-input {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  background: rgba(4, 9, 14, 0.45);
  transition: border-color 180ms ease;
}

.prefix-input:focus-within {
  border-color: rgba(68, 166, 241, 0.72);
  box-shadow: 0 0 0 4px rgba(68, 166, 241, 0.07);
}

.prefix-input :deep(svg) {
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

.prefix-input input {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  color: var(--color-text-primary);
  background: transparent;
  font: inherit;
  font-size: 0.87rem;
}

.prefix-input input::placeholder {
  color: #607080;
}

.generate-button,
.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 13px;
  font: inherit;
  font-weight: 720;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.generate-button {
  width: 100%;
  min-height: 51px;
  border: 0;
  color: white;
  background: linear-gradient(105deg, var(--color-blue-primary), var(--color-blue-light));
  box-shadow: 0 14px 35px rgba(29, 106, 230, 0.22);
}

.generate-button:hover,
.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-2px);
}

.result-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.strength-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid rgba(68, 166, 241, 0.23);
  border-radius: 999px;
  color: #b8dcf8;
  background: rgba(68, 166, 241, 0.08);
  font-size: 0.7rem;
  font-weight: 700;
}

.generated-result {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.key-output {
  min-height: 142px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 22px;
  border: 1px solid rgba(68, 166, 241, 0.22);
  border-radius: 18px;
  background: rgba(2, 7, 12, 0.64);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}

.key-output code {
  flex: 1;
  min-width: 0;
  color: #dff2ff;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.86rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
  word-break: break-all;
}

.icon-button {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.035);
  cursor: pointer;
}

.strength-block {
  margin: 25px 0 18px;
}

.strength-copy {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--color-text-muted);
  font-size: 0.73rem;
}

.strength-copy strong {
  color: var(--color-text-secondary);
  font-weight: 700;
}

.strength-track {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
}

.strength-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-blue-primary), var(--color-blue-light));
  transition: width 360ms ease;
}

.key-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: var(--color-text-muted);
  font-size: 0.7rem;
}

.key-metadata span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 28px;
}

.primary-action,
.secondary-action {
  min-height: 48px;
}

.primary-action {
  border: 0;
  color: white;
  background: linear-gradient(105deg, var(--color-blue-primary), #1c8fe2);
  box-shadow: 0 12px 30px rgba(29, 106, 230, 0.16);
}

.secondary-action {
  border: 1px solid var(--color-border-strong);
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.035);
}

.security-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: auto;
  padding-top: 26px;
  color: var(--color-text-muted);
}

.security-note :deep(svg) {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  color: var(--color-blue-light);
}

.security-note p {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.55;
}

.empty-result {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  padding: 30px;
}

.empty-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
  border: 1px solid rgba(68, 166, 241, 0.2);
  border-radius: 22px;
  color: var(--color-blue-light);
  background: linear-gradient(145deg, rgba(68, 70, 241, 0.13), rgba(68, 166, 241, 0.07));
  box-shadow: 0 20px 50px rgba(11, 72, 160, 0.12);
}

.empty-icon :deep(svg) {
  width: 28px;
  height: 28px;
}

.empty-result h3 {
  margin: 0 0 8px;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 720;
}

.empty-result p {
  max-width: 300px;
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

@media (max-width: 920px) {
  .generator-card {
    grid-template-columns: 1fr;
  }

  .settings-panel {
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .result-panel {
    min-height: 520px;
  }
}

@media (max-width: 560px) {
  .settings-panel,
  .result-panel {
    padding: 25px 20px;
  }

  .result-panel {
    min-height: 500px;
  }

  .result-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-actions {
    grid-template-columns: 1fr;
  }

  .key-output {
    min-height: 160px;
    padding: 18px;
  }
}
</style>
