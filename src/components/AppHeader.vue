<script setup lang="ts">
import { KeyRound, Moon, Sun } from '@lucide/vue'

import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()
</script>

<template>
  <header class="app-header">
    <a class="brand" href="/" aria-label="Ir al generador de API keys">
      <span class="brand-mark" aria-hidden="true">
        <KeyRound />
      </span>
      <span>API Key Generator X</span>
    </a>

    <button
      type="button"
      class="theme-button"
      :aria-label="theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      :title="theme === 'dark' ? 'Tema claro' : 'Tema oscuro'"
      @click="toggleTheme"
    >
      <Sun v-if="theme === 'dark'" />
      <Moon v-else />
    </button>
  </header>
</template>

<style scoped>
.app-header {
  width: min(960px, calc(100% - 40px));
  height: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text);
  font-size: 0.94rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  text-decoration: none;
}

.brand-mark,
.theme-button {
  display: grid;
  place-items: center;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--color-inverse-text);
  background: var(--color-inverse);
}

.brand-mark :deep(svg) {
  width: 17px;
  height: 17px;
}

.theme-button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.theme-button:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
  transform: translateY(-1px);
}

.theme-button :deep(svg) {
  width: 17px;
  height: 17px;
}

@media (max-width: 560px) {
  .app-header {
    width: min(100% - 28px, 960px);
    height: 68px;
  }
}
</style>
