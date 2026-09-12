import { NextResponse, type NextRequest } from "next/server";
import { resolveHost, resolveTempPathSurface } from "./lib/host.js";
import { BASE_DOMAIN } from "./lib/env";

// Este middleware es la única pieza que decide, por request, cuál de las 3
// superficies corresponde (root / account / emergency / pet) y reescribe la
// URL internamente para que las rutas de app/ queden organizadas por superficie
// sin exponer eso en la URL pública.
export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const resolved = resolveHost(hostHeader, BASE_DOMAIN);

  if (!resolved) {
    return new NextResponse("Dominio no reconocido", { status: 404 });
  }

  const url = request.nextUrl.clone();

  // Las rutas de API viven en un solo lugar (app/api/…), NO adentro de
  // ninguna carpeta de superficie — a diferencia de las páginas, nunca hay
  // que anteponerles /surfaces/<algo>. Sin este corte temprano, CUALQUIER
  // request a la API (login, activar chapita, subir fotos, todo) quedaba
  // reescrito a una ruta que no existe (ej. /surfaces/root/api/pets/xyz) y
  // devolvía 404 siempre — nunca se notó antes porque hasta ahora todo se
  // probó en modo vista previa, que no llega a tocar la API de verdad.
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Mientras no haya dominio propio con DNS wildcard, TODO pega en el host
  // raíz (resolved.surface siempre es "root") — así que acá, y solo en ese
  // caso, se mira el path para dejar entrar a account/emergency/pet sin
  // subdominio real (/app, /tag/<token>, /p/<slug>), navegables con links
  // normales en vez de escribir URLs a mano. Es TEMPORAL a propósito: el día
  // que haya dominio propio, esas superficies llegan con su propio host
  // (resolved.surface deja de ser "root" para ellas) y este bloque
  // simplemente no se ejecuta más — no hay que acordarse de borrar nada.
  // `x-surface-prefix`: el prefijo que hay que anteponerle a cualquier link
  // INTERNO a esta misma superficie (ej. desde la cuenta, el link a
  // "gestionar la mascota X") para que funcione tanto hoy (alias temporal
  // por path, sin dominio propio) como el día de mañana (subdominio real,
  // donde el prefijo es "" porque la superficie ya vive en su propio host).
  // Así el código de cada página nunca hardcodea "/app" ni "/pets/x" a
  // secas — lee este header y listo, sin tener que tocarlo cuando cambie el
  // dominio. Ver lib/surface-prefix.ts para el lado que lo lee.
  if (resolved.surface === "root") {
    const tempMatch = resolveTempPathSurface(url.pathname);
    if (tempMatch) {
      if (tempMatch.surface === "pet") {
        url.pathname = `/surfaces/pet${tempMatch.rest}`;
        const response = NextResponse.rewrite(url);
        response.headers.set("x-pet-slug", tempMatch.slug);
        response.headers.set("x-surface-prefix", `/p/${tempMatch.slug}`);
        return response;
      }
      const prefix = tempMatch.surface === "account" ? "/app" : "/tag";
      url.pathname = `/surfaces/${tempMatch.surface}${tempMatch.rest}`;
      const response = NextResponse.rewrite(url);
      response.headers.set("x-surface-prefix", prefix);
      return response;
    }
  }

  // OJO: en Next.js App Router, las carpetas que empiezan con "_" dentro de
  // app/ son "private folders" y NO son ruteables — por eso el rewrite va a
  // /surfaces/<superficie>/... (carpetas normales) y no a /_root, /_account, etc.
  // Es un detalle interno (el usuario nunca ve esta URL), pero si esto apunta
  // a una carpeta con "_" el rewrite devuelve 404 aunque el código "se vea bien".
  if (resolved.surface === "root") {
    url.pathname = `/surfaces/root${url.pathname}`;
  } else if (resolved.surface === "account") {
    url.pathname = `/surfaces/account${url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-surface-prefix", "");
    return response;
  } else if (resolved.surface === "emergency") {
    url.pathname = `/surfaces/emergency${url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-surface-prefix", "");
    return response;
  } else if (resolved.surface === "pet") {
    // El slug queda disponible para las rutas vía header interno, no vía la URL
    // pública — la app privada de la mascota no necesita mostrar su propio slug
    // en el path.
    url.pathname = `/surfaces/pet${url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-pet-slug", resolved.slug);
    response.headers.set("x-surface-prefix", "");
    return response;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos, archivos internos de Next, el service
    // worker (sw.js DEBE servirse tal cual desde la raíz, sin reescribir —
    // si no, el navegador nunca lo registra y las notificaciones push no
    // funcionan) y /api/ — para /api/ este middleware ya no hace nada más
    // que "dejar pasar" (ver el corte temprano de arriba), pero Next igual
    // buffereaba el body entero de cada request para poder pasárselo al
    // middleware, con un tope de 10MB por default. Eso truncaba en
    // silencio cualquier subida de más de 10MB (ej. el video de la
    // portada) sin devolver ningún error — el fetch del navegador se
    // quedaba esperando una respuesta que nunca llegaba bien. Sacando
    // /api/ del matcher, Next ni se molesta en bufferear esos requests.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|api/).*)",
  ],
};
