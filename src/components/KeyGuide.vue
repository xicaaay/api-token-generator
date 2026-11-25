<script setup lang="ts">
const formats = [
  {
    name: 'Estilo Stripe',
    use: 'API keys públicas de tu producto, con prefijo que indica tipo y entorno.',
  },
  { name: 'Hex 256 bits', use: 'Claves de cifrado, tokens de sesión y secretos de webhooks.' },
  { name: 'Secreto JWT', use: 'Firmar tokens JWT con HS256/HS512 (variable JWT_SECRET).' },
  { name: 'UUID v4', use: 'Identificadores únicos de registros, no como secreto.' },
  {
    name: 'Password de BD',
    use: 'Contraseñas para DATABASE_URL: sin caracteres que haya que escapar.',
  },
]

const faqs = [
  {
    q: '¿Es seguro generar claves en una página web?',
    a: 'Aquí sí: la clave se genera en tu navegador con crypto.getRandomValues, el generador criptográfico del sistema, y nunca se envía a ningún servidor. Puedes comprobarlo usando la app sin conexión.',
  },
  {
    q: '¿Cuántos bits de entropía necesito?',
    a: 'Para secretos y API keys, 128 bits es el mínimo recomendado y 256 bits es lo habitual. El indicador muestra la entropía exacta de cada clave.',
  },
  {
    q: '¿Por qué guardar el hash SHA-256 y no la clave?',
    a: 'Si tu base de datos se filtra, los hashes no sirven para autenticarse. Al recibir una petición, calculas el SHA-256 de la clave recibida y lo comparas con el guardado.',
  },
  {
    q: '¿Para qué sirve el prefijo?',
    a: 'Identifica de un vistazo el tipo y el entorno de la clave (sk_live_, sk_test_…) y permite que los escáneres de secretos la detecten si se sube por error a un repositorio.',
  },
  {
    q: '¿Qué significa URL-safe?',
    a: 'Que la clave solo usa caracteres que no hay que escapar en URLs, cabeceras ni archivos .env: letras, números y - _ . ~',
  },
]
</script>

<template>
  <section class="guide" aria-labelledby="guide-title">
    <div>
      <h2 id="guide-title">¿Qué formato elegir?</h2>
      <dl class="format-list">
        <div v-for="format in formats" :key="format.name">
          <dt>{{ format.name }}</dt>
          <dd>{{ format.use }}</dd>
        </div>
      </dl>
    </div>

    <div>
      <h2>Preguntas frecuentes</h2>
      <dl class="faq-list">
        <div v-for="faq in faqs" :key="faq.q">
          <dt>{{ faq.q }}</dt>
          <dd>{{ faq.a }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.guide {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(28px, 5vw, 56px);
  margin-top: 48px;
}

h2 {
  margin: 0 0 18px;
  color: var(--color-text);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

dl {
  display: grid;
  gap: 16px;
  margin: 0;
}

dt {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 650;
}

dd {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

.format-list > div {
  padding-left: 12px;
  border-left: 2px solid var(--color-border-strong);
}

@media (max-width: 760px) {
  .guide {
    grid-template-columns: 1fr;
  }
}
</style>
