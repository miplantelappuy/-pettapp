// Lógica pura de resolución de subdominio a partir del header Host + BASE_DOMAIN.
// Sin dependencias — así se puede testear con `node` solo, y el middleware de
// Next.js (middleware.ts) simplemente la importa.
//
// Superficies:
//   root      -> BASE_DOMAIN pelado (landing/marketing, fuera de alcance de Fase 0)
//   account   -> app.BASE_DOMAIN            (cuenta/familia, selector de mascotas)
//   emergency -> tag.BASE_DOMAIN            (perfil público de emergencia)
//   pet       -> {slug}.BASE_DOMAIN         (app privada de esa mascota)
//
// Nunca hardcodea un dominio: todo se resuelve contra el BASE_DOMAIN recibido.

const RESERVED_SUBDOMAINS = new Set(["app", "tag", "www"]);

/**
 * @param {string} hostHeader  el header Host tal como llega en el request (puede incluir puerto)
 * @param {string} baseDomain  el dominio base configurado (BASE_DOMAIN), puede incluir puerto
 * @returns {{ surface: "root" }
 *         | { surface: "account" }
 *         | { surface: "emergency" }
 *         | { surface: "pet", slug: string }
 *         | null}  null si el host no corresponde a ninguna superficie válida
 */
export function resolveHost(hostHeader, baseDomain) {
  if (!hostHeader || !baseDomain) return null;

  const host = String(hostHeader).trim().toLowerCase().replace(/\.$/, "");
  const base = String(baseDomain).trim().toLowerCase().replace(/\.$/, "");

  if (host === base) {
    return { surface: "root" };
  }

  const suffix = `.${base}`;
  if (!host.endsWith(suffix)) {
    return null; // host de otro dominio por completo
  }

  const prefix = host.slice(0, -suffix.length);

  // Un solo nivel de subdominio — nunca anidado (no soportamos milo.algo.BASE_DOMAIN)
  if (prefix.length === 0 || prefix.includes(".")) {
    return null;
  }

  if (prefix === "app") return { surface: "account" };
  if (prefix === "tag") return { surface: "emergency" };
  if (RESERVED_SUBDOMAINS.has(prefix)) return null; // 'www' u otro reservado sin mapeo

  // Cualquier otro prefijo es, en principio, el slug de una mascota.
  // La validez real del slug (existe en la DB, no está deshabilitado) se
  // resuelve después, contra la base de datos — acá solo hacemos parsing.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(prefix)) {
    return null; // no tiene forma de slug válido
  }

  return { surface: "pet", slug: prefix };
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Alias de rutas TEMPORAL, solo mientras no hay dominio propio con DNS
 * wildcard: deja entrar a las superficies account/emergency/pet desde el
 * dominio raíz (sin subdominio real), navegando con links normales en vez
 * de escribir subdominios a mano. El middleware solo llama a esto cuando
 * `resolveHost` ya dio surface "root" — el día que haya dominio propio, cada
 * superficie le llega con SU host (surface ya no es "root") y este alias
 * deja de usarse solo, sin tener que borrar nada a las apuradas.
 *
 * @param {string} pathname
 * @returns {{ surface: "account", rest: string }
 *         | { surface: "emergency", rest: string }
 *         | { surface: "pet", slug: string, rest: string }
 *         | null}
 */
export function resolveTempPathSurface(pathname) {
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const rest = pathname.slice("/app".length);
    return { surface: "account", rest: rest || "/" };
  }

  if (pathname === "/tag" || pathname.startsWith("/tag/")) {
    const rest = pathname.slice("/tag".length);
    return { surface: "emergency", rest: `/t${rest}` };
  }

  const petMatch = pathname.match(/^\/p\/([^/]+)(\/.*)?$/);
  if (petMatch && SLUG_RE.test(petMatch[1])) {
    return { surface: "pet", slug: petMatch[1], rest: petMatch[2] || "/" };
  }

  return null;
}
