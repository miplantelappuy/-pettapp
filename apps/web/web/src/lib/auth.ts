import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, magicLink } from "better-auth/plugins";
import { db } from "@pettapp/db";
import { BASE_DOMAIN, BASE_PROTOCOL, COOKIE_DOMAIN, urlFor } from "./env";
import { sendMagicLinkEmail } from "./email";

// ─────────────────────────────────────────────────────────────────────────
// Decisión de Fase 0: un solo método passwordless por email (magic link) +
// Google. NO se agrega también email-otp — el brief aprobado dice
// "alcanza con un método email passwordless + Google", así que elegimos uno
// para no duplicar superficie de mantenimiento. Apple queda para después
// (requiere alta en Apple Developer Program, que es un trámite externo).
// ─────────────────────────────────────────────────────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // Multi-tenant por subdominio: en vez de una baseURL fija, se valida el
  // host de cada request contra BASE_DOMAIN (nunca hardcodeado).
  baseURL: {
    allowedHosts: [BASE_DOMAIN, `*.${BASE_DOMAIN}`],
    protocol: BASE_PROTOCOL as "http" | "https",
    // Si algún proxy manda un host inesperado, mejor fallar explícito que
    // adivinar — por eso NO seteamos `fallback` acá.
  },

  trustedOrigins: [urlFor(null), urlFor("app"), urlFor("tag")],

  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      // Dominio raíz sin puerto: así la sesión iniciada en app.BASE_DOMAIN
      // vale también en {slug}.BASE_DOMAIN — es la pieza que hace posible
      // "loguearte una vez, todas tus mascotas quedan logueadas".
      domain: COOKIE_DOMAIN,
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // Vinculación de cuentas: comportamiento por defecto de Better Auth ya
  // resuelve el caso pedido (alguien crea cuenta con magic link a
  // facu@email.com y después entra con Google usando el mismo email) — el
  // link automático ocurre cuando el proveedor confirma el email como
  // verificado, y Google siempre lo confirma. Lo dejamos explícito acá en
  // vez de confiar en el default silencioso, para que quede documentada la
  // decisión y no se pierda si alguien toca esta config después.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  plugins: [
    // El "hogar/familia" de nuestro producto ES la organización de Better
    // Auth — no construimos una tabla accounts/account_members propia.
    organization({
      allowUserToCreateOrganization: true,
      // Una mascota pertenece a una organización; de movida no necesitamos
      // que una persona administre más de un hogar, pero no lo bloqueamos.
    }),
    magicLink({
      expiresIn: 60 * 15, // 15 minutos
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
  ],
});

export type Auth = typeof auth;
