# Keygen

Generador de API keys y secretos criptográficamente seguros. Funciona 100 % en el navegador: la clave nunca se envía ni se guarda en ningún servidor.

Desarrollado con Vue 3 y TypeScript.

## Funcionalidades

- Longitud configurable entre 8 y 128 caracteres.
- Mayúsculas, minúsculas, números y símbolos, cada grupo activable por separado.
- Cada grupo seleccionado aparece **al menos una vez** en la clave.
- Indicador de fuerza con la entropía estimada en bits.
- Mostrar u ocultar la clave, copiarla al portapapeles o descargarla como `.txt`.
- Tema claro y oscuro (respeta la preferencia del sistema y no parpadea al cargar).
- Diseño responsive.

## Decisiones técnicas

La parte delicada de un generador de claves es la aleatoriedad. Este proyecto la resuelve así (`src/utils/api-key.ts`):

- **Fuente de aleatoriedad:** `crypto.getRandomValues` (CSPRNG del navegador), nunca `Math.random`.
- **Sin sesgo de módulo:** hacer `byte % 62` favorece a los primeros caracteres, porque 256 no es múltiplo de 62. Por eso se usa *rejection sampling*: se descartan los bytes por encima del mayor múltiplo válido y se vuelve a sortear.
- **Garantía de grupos sin patrón predecible:** primero se toma un carácter de cada grupo seleccionado, luego se completa con el pool combinado y al final se mezcla todo con un **Fisher–Yates** que también usa el CSPRNG. Así los caracteres obligatorios no quedan siempre al inicio.

Los tests (`src/utils/__tests__/api-key.test.ts`) verifican la longitud, los caracteres permitidos, la presencia de cada grupo, la unicidad y la **uniformidad de la distribución con una prueba chi-cuadrado** sobre 200 000 muestras.

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
│  └─ AppHeader.vue             # Marca y cambio de tema
├─ composables/useTheme.ts      # Tema claro/oscuro persistente
├─ types/api-key.ts
├─ utils/
│  ├─ api-key.ts                # Generación segura
│  └─ __tests__/api-key.test.ts
└─ views/HomeView.vue
```

## Roadmap

- Presets: Hex, Base64url, UUID v4/v7, secreto JWT, estilo Stripe (`sk_live_…`).
- Prefijo personalizado y separadores.
- Modo URL-safe y opción para excluir caracteres ambiguos (`0/O`, `l/1/I`).
- Generación en lote con exportación a `.env`, JSON o CSV.
- Hash SHA-256 de la clave para guardarla en la base de datos.

## Privacidad

La generación ocurre únicamente en el navegador. La aplicación no almacena ni envía las claves a ningún servidor. Solo se guarda en `localStorage` la preferencia de tema.
