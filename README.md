# Keygen

Generador de API keys y secretos criptográficamente seguros. Funciona 100 % en el navegador: la clave nunca se envía ni se guarda en ningún servidor.

Desarrollado con Vue 3 y TypeScript.

## Funcionalidades

- **Presets:** Personalizada, Estilo Stripe (`sk_live_…`), Hex 256 bits, Secreto JWT (512 bits Base64url), UUID v4 y Password de base de datos.
- Formatos: caracteres, Hex, Base64url y UUID v4. Hex y Base64url admiten 128, 256 o 512 bits.
- Longitud configurable entre 8 y 128 caracteres, con mayúsculas, minúsculas, números y símbolos activables por separado.
- Cada grupo seleccionado aparece **al menos una vez** en la clave.
- **Modo URL-safe:** los símbolos se limitan a `- _ . ~`, que no hay que escapar en URLs, `DATABASE_URL` ni archivos `.env`.
- **Sin caracteres ambiguos:** quita `0 O 1 l I`.
- **Prefijo personalizado** (`sk_live_`, `myapp_prod_`…), validado y sin contarlo como entropía.
- **Generación en lote** de hasta 100 claves, con exportación a `.env`, JSON o CSV.
- **Hash SHA-256** de la clave, para guardar en la base de datos solo el hash.
- Indicador de fuerza con la **entropía exacta** en bits.
- Mostrar u ocultar la clave, copiarla al portapapeles o descargarla como `.txt`.
- **PWA instalable y sin conexión:** manifest, íconos (incluido el maskable) y service worker. Usarla offline es la mejor prueba de que nada sale del navegador.
- Guía de formatos y preguntas frecuentes, con datos estructurados (JSON-LD).
- Tema claro y oscuro (respeta la preferencia del sistema y no parpadea al cargar).
- Diseño responsive.

## Decisiones técnicas

La parte delicada de un generador de claves es la aleatoriedad. Este proyecto la resuelve así (`src/utils/api-key.ts`):

- **Fuente de aleatoriedad:** `crypto.getRandomValues` (CSPRNG del navegador), nunca `Math.random`.
- **Sin sesgo de módulo:** hacer `byte % 62` favorece a los primeros caracteres, porque 256 no es múltiplo de 62. Por eso se usa *rejection sampling*: se descartan los bytes por encima del mayor múltiplo válido y se vuelve a sortear.
- **Garantía de grupos sin sesgo:** la clave completa se sortea del pool combinado y, si le falta algún grupo seleccionado, se descarta y se vuelve a sortear. Así el resultado es uniforme entre todas las claves válidas y no hay posiciones "forzadas".
- **Entropía exacta:** al exigir cada grupo, `longitud × log2(pool)` sobrestima la entropía. Por eso se cuentan las claves válidas por **inclusión–exclusión** (`Σ (−1)^|S| · (pool − |S|)^n`, con `BigInt`) y se reporta su `log2`. El prefijo no suma entropía.
- **Exportación segura:** en `.env` los valores van entre comillas simples para que dotenv no interprete `$` como variable. En CSV se escapan comas y comillas.

Los tests (`src/utils/__tests__/`) verifican la longitud, los caracteres permitidos, la presencia de cada grupo, la unicidad, la **uniformidad con una prueba chi-cuadrado** sobre 200 000 muestras, el cálculo de entropía contra un conteo por fuerza bruta, cada formato y preset, el vector de prueba de SHA-256 y el escapado de cada exportación.

## Instalación

Requiere Node.js `^22.18.0` o `>=24.12.0`.

```bash
git clone https://github.com/xicaaay/api-token-generator.git
cd api-token-generator
npm install
npm run dev
```

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests unitarios (Vitest) |
| `npm run type-check` | Verificación de tipos con `vue-tsc` |
| `npm run lint` | oxlint + ESLint |
| `npm run build` | Type-check, tests y build de producción |

## Estructura

```txt
src/
├─ App.vue                      # Raíz: vista + notificaciones
├─ components/
│  ├─ ApiKeyGenerator.vue       # Controles, resultado y acciones
│  ├─ AppHeader.vue             # Marca y cambio de tema
│  └─ KeyGuide.vue              # Guía de formatos y preguntas frecuentes
├─ composables/useTheme.ts      # Tema claro/oscuro persistente
├─ types/api-key.ts
├─ utils/
│  ├─ api-key.ts                # Generación segura, presets y entropía
│  ├─ export.ts                 # Exportación .env / JSON / CSV
│  └─ __tests__/
└─ views/HomeView.vue
public/
├─ manifest.webmanifest
├─ sw.js                        # Service worker (uso sin conexión)
└─ icons/                       # Íconos PWA 192, 512 y maskable
```

## Sin conexión (PWA)

El service worker se registra solo en producción (`import.meta.env.PROD`). Responde las navegaciones con red primero y, si no hay conexión, con el `index.html` guardado. Los archivos de `/assets/` llevan hash, así que se sirven desde caché. Si haces un cambio incompatible en la caché, sube `VERSION` en `public/sw.js`.

En el hosting conviene servir `/sw.js` con `Cache-Control: no-cache` para que las actualizaciones lleguen enseguida.

## Roadmap

- CLI / paquete npm (`npx keygen --preset jwt`).
- Imagen Open Graph y URL pública (pendiente del dominio).

## Privacidad

La generación ocurre únicamente en el navegador. La aplicación no almacena ni envía las claves a ningún servidor. Solo se guarda en `localStorage` la preferencia de tema.
