<script setup lang="ts">
const faqs = [
  {
    q: '¿Cuántos bits necesito?',
    a: '128 bits es el mínimo recomendado para secretos y API keys; 256 bits es lo habitual.',
  },
  {
    q: '¿Por qué guardar el SHA-256 y no la clave?',
    a: 'Si tu base de datos se filtra, los hashes no sirven para autenticarse. Al recibir una petición, calcula el SHA-256 de la clave y compáralo con el guardado.',
  },
  {
    q: '¿Para qué sirve el prefijo?',
    a: 'Indica el tipo y entorno de la clave (sk_live_, sk_test_…) y ayuda a que los escáneres de secretos la detecten si se filtra en un repositorio.',
  },
]
</script>

<template>
  <section class="faq" aria-label="Preguntas frecuentes">
    <details v-for="faq in faqs" :key="faq.q">
      <summary>
        {{ faq.q }}
        <span aria-hidden="true">+</span>
      </summary>
      <p>{{ faq.a }}</p>
    </details>
  </section>
</template>

<style scoped>
.faq {
  margin-top: 56px;
}

details {
  border-bottom: 1px solid var(--color-border);
}

summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

summary span {
  color: var(--color-muted);
  transition: transform 150ms ease;
}

details[open] summary span {
  transform: rotate(45deg);
}

p {
  margin: 0 0 16px;
  color: var(--color-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
