import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@pettapp/db";
import { auth } from "./auth";
import { hasPetAccess } from "./pin";

// Único punto donde se decide "¿esta persona puede administrar esta
// mascota?" — todas las rutas de API que dejan editar fotos, estilo, datos
// de emergencia o vacunas pasan por acá, en vez de repetir el chequeo cada
// una a su manera.
//
// Dos caminos válidos, en este orden:
//  1. La cookie de PIN de lib/pin.ts (el flujo principal hoy: activar la
//     chapita + PIN, sin cuenta).
//  2. Una sesión de Better Auth con membresía en la organización de la
//     mascota (el flujo de cuenta de /app, que sigue funcionando por si se
//     retoma más adelante).
// `ok` como discriminante explícito (en vez de inferir por la presencia de
// "error") — así TypeScript puede angostar el tipo de forma confiable en
// cada callsite sin ambigüedad.
export async function assertPetOwnership(request: NextRequest, petId: string) {
  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
  if (!pet) return { ok: false as const, error: "Mascota no encontrada", status: 404 as const };

  if (await hasPetAccess(petId)) {
    return { ok: true as const, session: null, pet };
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { ok: false as const, error: "No autenticado", status: 401 as const };

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, pet.organizationId), eq(schema.member.userId, session.user.id)),
  });
  if (!membership) {
    return { ok: false as const, error: "No pertenecés a la familia de esta mascota", status: 403 as const };
  }

  return { ok: true as const, session, pet };
}
