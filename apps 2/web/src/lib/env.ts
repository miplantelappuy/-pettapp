// Punto único de lectura de configuración de dominio. Ningún otro archivo
// debe leer process.env.BASE_DOMAIN directamente ni armar URLs a mano.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const BASE_DOMAIN = required("BASE_DOMAIN"); // ej: "localhost:3000" | "tuapp.com"
export const BASE_PROTOCOL = process.env.BASE_PROTOCOL ?? "https";

export function urlFor(subdomain: "app" | "tag" | null | (string & {}), path = "/"): string {
  const host = subdomain ? `${subdomain}.${BASE_DOMAIN}` : BASE_DOMAIN;
  return `${BASE_PROTOCOL}://${host}${path}`;
}

export function petUrl(slug: string, path = "/"): string {
  return urlFor(slug, path);
}

// El atributo Domain de una cookie no admite puerto — en local (BASE_DOMAIN
// suele ser "localhost:3000") hay que pelarlo. Este es justo el punto que
// marcamos como riesgo a validar con un navegador real (no se puede probar
// de verdad sin uno): confirmar que las cookies con Domain=.localhost se
// comparten entre subdominios *.localhost en el navegador que uses.
export const COOKIE_DOMAIN = BASE_DOMAIN.split(":")[0];

// Se pone en "true" (variable de entorno) recién el día que haya un dominio
// propio con DNS wildcard configurado — hasta entonces, TODO vive en un solo
// host y las superficies se alcanzan por path (ver lib/host.js,
// resolveTempPathSurface). Este es el único interruptor: cuando se prenda,
// crossSurfaceUrl/scanUrlFor empiezan a devolver URLs de subdominio real
// solas, sin tocar el resto del código.
export const HAS_CUSTOM_DOMAIN = process.env.HAS_CUSTOM_DOMAIN === "true";

// Para linkear DESDE una superficie HACIA otra (ej. desde el álbum de una
// mascota, volver a la cuenta). Servidor-only (usa BASE_DOMAIN) — si un
// componente cliente necesita esto, se lo tiene que pasar como prop ya
// resuelto desde su page.tsx, igual que ya se hace con albumHref/backHref.
export function crossSurfaceUrl(surface: "app" | "tag" | string, path = "/"): string {
  if (!HAS_CUSTOM_DOMAIN) {
    const prefix = surface === "app" ? "/app" : surface === "tag" ? "/tag" : `/p/${surface}`;
    return `${prefix}${path}`;
  }
  return urlFor(surface, path);
}

// URL completa (con protocolo y host) para el QR físico de una chapita —
// tiene que ser absoluta sí o sí porque la lee la cámara de un celular sin
// ningún contexto previo. En modo temporal (sin dominio propio) apunta al
// mismo host por path; con dominio propio, al subdominio tag.BASE_DOMAIN.
export function scanUrlFor(token: string): string {
  if (!HAS_CUSTOM_DOMAIN) return urlFor(null, `/tag/${token}`);
  return urlFor("tag", `/t/${token}`);
}
