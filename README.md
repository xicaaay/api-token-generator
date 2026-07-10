# API Key Factory

Aplicación Vue 3 para generar API keys de forma local, segura e interactiva.

## Funcionalidades

- Selección de complejidad: simple, estándar y avanzada.
- Longitud configurable entre 16 y 128 caracteres aleatorios.
- Prefijo opcional personalizable.
- Generación criptográficamente segura con `crypto.getRandomValues`.
- Mostrar u ocultar la clave generada.
- Copiar al portapapeles.
- Descargar la API key en un archivo `.txt`.
- Notificaciones con `vue-sonner`.
- Iconos con la librería oficial de Lucide para Vue.
- Diseño responsive basado en la paleta azul, negro, gris y blanco del branding compartido.

## Instalación

```bash
npm install
npm run dev
```

El proyecto se abrirá normalmente en `http://localhost:5173`.

## Verificaciones

```bash
npm run type-check
npm run lint
npm run build
```

## Dependencias agregadas

```bash
npm install @lucide/vue vue-sonner
```

## Seguridad

La aplicación genera las claves únicamente en el navegador. No realiza peticiones a un backend ni almacena las API keys generadas.
