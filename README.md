# La app de tu mascota — Fase 0

Base estructural: multi-tenant por subdominio, auth passwordless (magic link + Google) con
Better Auth, chapitas QR con historial de reemplazo, storage abstraído (R2/local), y
procesamiento de medios en un worker separado.

## Qué SÍ hace esta Fase 0

- Resuelve 3 superficies por subdominio (`app.`, `{slug}.`, `tag.`) a partir de `BASE_DOMAIN`.
- Login sin contraseña: magic link por email + Google, con sesión compartida entre subdominios.
- Vinculación automática de cuentas cuando el mismo email verificado se usa por dos vías.
- Mascotas, chapitas QR (con reemplazo/historial) y recuerdos (subida + thumbnail) de punta a punta.
- Interfaz de proveedor de pago sin implementación real (no hay checkout todavía).

## Qué NO hace todavía (a propósito)

Timeline, salud, crecimiento, veterinario, recordatorios, plantillas visuales, push
notifications, transcodificación real de video, checkout de Mercado Pago, Apple Sign-In.

## Requisitos

- Node 20+
- PostgreSQL 16 corriendo localmente (o accesible por `DATABASE_URL`)
- Redis corriendo localmente (o accesible por `REDIS_URL`)

## Cómo correrlo

```bash
# 1. Instalar dependencias (única parte que no pude ejecutar yo — ver informe de Fase 0)
npm install

# 2. Variables de entorno
cp .env.example .env
# Completar al menos: DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET

# 3. Crear la base y aplicar el schema (ya verificado contra Postgres real)
createdb pettapp_dev   # si no existe
npm run db:migrate

# 4. Levantar la web y el worker (dos terminales)
npm run dev:web
npm run dev:worker
```

Para simular subdominios en local sin tocar `/etc/hosts`, los navegadores modernos
resuelven `*.localhost` a `127.0.0.1` solos. Con `BASE_DOMAIN=localhost:3000`:

- http://milo.localhost:3000 → app privada de una mascota "milo" (tiene que existir en la DB)
- http://app.localhost:3000 → cuenta/familia
- http://tag.localhost:3000/t/{token} → perfil de emergencia

Si tu navegador no resuelve `*.localhost` bien, `lvh.me` es la alternativa (resuelve
`*.lvh.me` a 127.0.0.1 vía DNS público) — cambiando `BASE_DOMAIN=lvh.me:3000`.

## Pruebas que sí corren sin instalar nada

```bash
npm run test:pure   # lógica de subdominios + máquina de estados de QR, cero dependencias
```

## Generar un lote de chapitas QR

```bash
npx tsx scripts/generate-qr-batch.ts --count=500 --batch=batch_2026_09
```
