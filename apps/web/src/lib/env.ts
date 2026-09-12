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
