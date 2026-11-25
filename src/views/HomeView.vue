<script setup lang="ts">
import ApiKeyGenerator from '@/components/ApiKeyGenerator.vue'
import AppHeader from '@/components/AppHeader.vue'
import KeyGuide from '@/components/KeyGuide.vue'
</script>

<template>
  <div class="home-page">
    <AppHeader />

    <main>
      <ApiKeyGenerator />
      <KeyGuide />
    </main>

    <footer>
      ¿Necesitas un código QR?
      <a href="https://qr-a.netlify.app/">Prueba QR Generator</a>
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
  width: min(760px, calc(100% - 32px));
  margin: 0 auto;
}

main {
  flex: 1;
  padding: 24px 0 48px;
}

footer {
  padding: 24px 0 32px;
  color: var(--color-muted);
  font-size: 0.8rem;
  text-align: center;
}

footer a {
  color: var(--color-text);
  text-underline-offset: 2px;
}
</style>
