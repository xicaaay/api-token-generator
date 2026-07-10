<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
</script>

<template>
  <header class="app-header">
    <a class="brand" href="/" aria-label="Ir al generador de API keys">
      <span class="brand-mark" aria-hidden="true">
        <KeyRound />
      </span>

      <span class="brand-copy">
        <strong>API KEY</strong>
        <span>FACTORY</span>
      </span>
    </a>

    <div class="local-badge">
      <span class="status-dot" aria-hidden="true"></span>
      Generación local
    </div>
  </header>
</template>

<style scoped>
.app-header {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 13px;
  color: var(--color-text-primary);
  text-decoration: none;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(68, 166, 241, 0.3);
  border-radius: 13px;
  background: linear-gradient(145deg, rgba(68, 70, 241, 0.95), rgba(68, 166, 241, 0.92));
  box-shadow: 0 12px 30px rgba(22, 112, 255, 0.24);
}

.brand-mark :deep(svg) {
  width: 21px;
  height: 21px;
}

.brand-copy {
  display: grid;
  line-height: 0.9;
  letter-spacing: 0.07em;
}

.brand-copy strong,
.brand-copy span {
  font-weight: 800;
}

.brand-copy span {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  margin-top: 7px;
}

.local-badge {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 13px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-text-secondary);
  background: rgba(16, 27, 38, 0.72);
  font-size: 0.78rem;
  font-weight: 650;
  backdrop-filter: blur(14px);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-blue-light);
  box-shadow: 0 0 0 5px rgba(68, 166, 241, 0.1);
}

@media (max-width: 560px) {
  .app-header {
    width: min(100% - 28px, 1180px);
    padding: 20px 0;
  }

  .local-badge {
    padding: 9px;
    font-size: 0;
  }
}
</style>
