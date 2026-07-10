# Keygen

Generador minimalista de API keys desarrollado con Vue 3 y TypeScript.

## Funcionalidades

- Tema claro y oscuro con preferencia persistente.
- Longitud configurable entre 8 y 128 caracteres.
- Selección independiente de mayúsculas, minúsculas, números y símbolos.
- Generación criptográficamente segura con `crypto.getRandomValues`.
- Cada grupo seleccionado aparece al menos una vez en la clave.
- Mostrar u ocultar la clave generada.
- Copiar al portapapeles y descargar como archivo `.txt`.
- Notificaciones con `vue-sonner`.
- Iconos con Lucide para Vue.
- Diseño responsive en blanco y negro.

## Instalación

```bash
npm install
npm run dev
```

## Verificaciones

```bash
npm run type-check
npm run lint
npm run build
```

La generación ocurre únicamente en el navegador. La aplicación no almacena ni envía las claves a ningún servidor.
