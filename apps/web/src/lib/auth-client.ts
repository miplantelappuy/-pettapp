import { createAuthClient } from "better-auth/client";
import { organizationClient, magicLinkClient } from "better-auth/client/plugins";
import { urlFor } from "./env";

// El cliente de auth siempre habla con app.BASE_DOMAIN — es la superficie
// central de cuenta/familia, incluso cuando el usuario está parado en la
// app privada de una mascota (gracias a crossSubDomainCookies, la sesión
// resultante sirve para todos los subdominios igual).
export const authClient = createAuthClient({
  baseURL: urlFor("app"),
  plugins: [organizationClient(), magicLinkClient()],
});
