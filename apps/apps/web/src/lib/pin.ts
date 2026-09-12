// Acceso al panel de dueño SIN cuenta: un PIN de 4-6 dígitos que se define
// al vincular la chapita. Server-only (usa node:crypto + cookies de
// next/headers) — nunca importar esto desde un componente cliente.
//
// Reemplaza, para el flujo principal, al login por email de Better Auth
// (que queda construido y funcionando en /app por si más adelante hace
// falta una cuenta de verdad — hoy no es donde vive la experiencia
// principal del producto).

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";

const KEYLEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(8).toString("hex");
  const hash = scryptSync(pin, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// HMAC propio en vez de una sesión de verdad — para esta etapa alcanza (la
// chapita física ya es la barrera principal; el PIN es la segunda). Firma
// con BETTER_AUTH_SECRET para no sumar un secreto más a configurar en Railway.
const SECRET = process.env.BETTER_AUTH_SECRET ?? "dev-secret-inseguro-solo-local";
const ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 60; // 60 días

export function signPetAccessToken(petId: string): string {
  const expires = Date.now() + ACCESS_TTL_MS;
  const sig = createHmac("sha256", SECRET).update(`${petId}.${expires}`).digest("hex");
  return `${expires}.${sig}`;
}

export function verifyPetAccessToken(petId: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const [expiresStr, sig] = token.split(".");
  const expires = Number(expiresStr);
  if (!expires || !sig || Number.isNaN(expires) || Date.now() > expires) return false;
  const expected = createHmac("sha256", SECRET).update(`${petId}.${expires}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function petAccessCookieName(petId: string): string {
  return `pin_ok_${petId}`;
}

// OJO (para el día del dominio propio): esta cookie se pone sin `domain`
// explícito, así que queda atada al host donde se generó. Hoy no importa
// (todo vive en un solo host, ver lib/host.js). Con subdominio real,
// activar la chapita desde tag.BASE_DOMAIN y gestionar desde {slug}.BASE_DOMAIN
// son hosts distintos — hay que revisar esto entonces (lo más simple:
// redirigir después de activar pasando por la propia URL de la mascota para
// que la cookie se ponga ahí).
export async function hasPetAccess(petId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(petAccessCookieName(petId))?.value;
  return verifyPetAccessToken(petId, token);
}
