import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "./src/lib/host.js";
import { BASE_DOMAIN } from "./src/lib/env";

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

  // OJO: en Next.js App Router, las carpetas que empiezan con "_" dentro de
  // app/ son "private folders" y NO son ruteables — por eso el rewrite va a
  // /surfaces/<superficie>/... (carpetas normales) y no a /_root, /_account, etc.
  // Es un detalle interno (el usuario nunca ve esta URL), pero si esto apunta
  // a una carpeta con "_" el rewrite devuelve 404 aunque el código "se vea bien".
  if (resolved.surface === "root") {
    url.pathname = `/surfaces/root${url.pathname}`;
  } else if (resolved.surface === "account") {
    url.pathname = `/surfaces/account${url.pathname}`;
  } else if (resolved.surface === "emergency") {
    url.pathname = `/surfaces/emergency${url.pathname}`;
  } else if (resolved.surface === "pet") {
    // El slug queda disponible para las rutas vía header interno, no vía la URL
    // pública — la app privada de la mascota no necesita mostrar su propio slug
    // en el path.
    url.pathname = `/surfaces/pet${url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-pet-slug", resolved.slug);
    return response;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Todo excepto assets estáticos y archivos internos de Next.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
