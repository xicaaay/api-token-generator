<script setup lang="ts">
import { LockKeyhole, Shield } from '@lucide/vue'

import ApiKeyGenerator from '@/components/ApiKeyGenerator.vue'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="home-page">
    <AppHeader />

    <main>
      <section class="hero-section">
        <div class="hero-copy">
          <span class="hero-kicker">
            <Shield />
            GENERADOR SEGURO
          </span>

          <h1>
            Crea claves seguras.
            <span>Sin complicaciones.</span>
          </h1>

          <p>
            Genera API keys personalizadas con control de longitud y complejidad. Todo ocurre de
            forma local en tu navegador.
          </p>
        </div>

        <div class="hero-stat" aria-label="Información de seguridad">
          <LockKeyhole />
          <div>
            <strong>Web Crypto API</strong>
            <span>Aleatoriedad criptográfica</span>
          </div>
        </div>
      </section>

      <ApiKeyGenerator />
    </main>

    <footer>
      <span>API KEY FACTORY</span>
      <p>Generación local. Tus claves nunca salen de tu dispositivo.</p>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.home-page::before,
.home-page::after {
  position: fixed;
  content: '';
  z-index: -1;
  border-radius: 50%;
  filter: blur(110px);
  pointer-events: none;
}

.home-page::before {
  width: 360px;
  height: 360px;
  top: -120px;
  left: -100px;
  background: rgba(68, 70, 241, 0.14);
}

.home-page::after {
  width: 420px;
  height: 420px;
  right: -190px;
  bottom: 80px;
  background: rgba(68, 166, 241, 0.11);
}

main,
footer {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

.hero-section {
  min-height: 330px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 60px;
  padding: 58px 0 68px;
}

.hero-copy {
  max-width: 760px;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-blue-light);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.17em;
}

.hero-copy h1 {
  margin: 18px 0 20px;
  color: var(--color-text-primary);
  font-size: clamp(2.8rem, 7vw, 5.5rem);
  font-weight: 820;
  line-height: 0.97;
  letter-spacing: -0.075em;
}

.hero-copy h1 span {
  display: block;
  color: transparent;
  background: linear-gradient(90deg, var(--color-blue-light), #86c9f2);
  -webkit-background-clip: text;
  background-clip: text;
}

.hero-copy p {
  max-width: 630px;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: clamp(0.95rem, 1.8vw, 1.08rem);
  line-height: 1.72;
}

.hero-stat {
  flex: 0 0 auto;
  width: 230px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: rgba(16, 27, 38, 0.55);
  backdrop-filter: blur(16px);
}

.hero-stat > :deep(svg) {
  width: 24px;
  height: 24px;
  color: var(--color-blue-light);
}

.hero-stat div {
  display: grid;
  gap: 2px;
}

.hero-stat strong {
  color: var(--color-text-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.hero-stat span {
  color: var(--color-text-muted);
  font-size: 0.68rem;
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 36px 0 44px;
  color: var(--color-text-muted);
  font-size: 0.68rem;
}

footer span {
  color: var(--color-text-secondary);
  font-weight: 750;
  letter-spacing: 0.13em;
}

footer p {
  margin: 0;
}

@media (max-width: 820px) {
  .hero-section {
    align-items: flex-start;
    flex-direction: column;
    gap: 28px;
    min-height: auto;
  }

  .hero-stat {
    width: auto;
  }
}

@media (max-width: 560px) {
  main,
  footer {
    width: min(100% - 28px, 1180px);
  }

  .hero-section {
    padding: 45px 0 48px;
  }

  .hero-copy h1 {
    font-size: clamp(2.6rem, 15vw, 4.25rem);
  }

  footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
