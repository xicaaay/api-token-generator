<script setup lang="ts">
import ApiKeyGenerator from '@/components/ApiKeyGenerator.vue'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="home-page">
    <AppHeader />

    <main>
      <ApiKeyGenerator />
    </main>

    <footer>
      <span>Generación local y segura.</span>
      <span>Las claves nunca salen de tu navegador.</span>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main,
footer {
  width: min(960px, calc(100% - 40px));
  margin: 0 auto;
}

main {
  flex: 1;
  padding: 28px 0 40px;
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 32px;
  color: var(--color-muted);
  font-size: 0.72rem;
}

@media (max-width: 560px) {
  main,
  footer {
    width: min(100% - 28px, 960px);
  }

  main {
    padding: 18px 0 28px;
  }

  footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
