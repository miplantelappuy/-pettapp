import { createAuthClient } from "better-auth/client";
import { organizationClient, magicLinkClient } from "better-auth/client/plugins";

// A propósito SIN `baseURL` fijo a app.BASE_DOMAIN: eso obligaba al
// navegador a pegarle a un subdominio que hoy (sin dominio propio con DNS
// wildcard) no resuelve. Better Auth, sin baseURL, usa el mismo origen que
// la página — funciona tanto hoy (todo vive en un solo host) como el día de
// mañana con dominio propio (cada subdominio le pega a su propio
// /api/auth/…, y la cookie compartida entre subdominios la pone el server
// vía crossSubDomainCookies igual, sin importar cuál subdominio atendió el
// pedido).
export const authClient = createAuthClient({
  plugins: [organizationClient(), magicLinkClient()],
});
