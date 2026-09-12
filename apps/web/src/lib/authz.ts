import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db, schema } from "@pettapp/db";
import { auth } from "./auth";

// Único punto donde se decide "¿esta persona puede administrar esta
// mascota?" — todas las rutas de API que dejan editar fotos, estilo, datos
// de emergencia o vacunas pasan por acá, en vez de repetir el chequeo cada
// una a su manera.
export async function assertPetOwnership(request: NextRequest, petId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { error: "No autenticado", status: 401 as const };

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
  if (!pet) return { error: "Mascota no encontrada", status: 404 as const };

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, pet.organizationId), eq(schema.member.userId, session.user.id)),
  });
  if (!membership) return { error: "No pertenecés a la familia de esta mascota", status: 403 as const };

  return { session, pet };
}
