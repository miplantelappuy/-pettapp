import { NextResponse, type NextRequest } from "next/server";
import { assertPetOwnership } from "@/lib/authz";
import { signOrgInviteToken } from "@/lib/pin";
import { absoluteCrossSurfaceUrl } from "@/lib/env";

// POST /api/pets/:petId/share-link — genera un enlace para sumar a otra
// persona como dueña de ESTA mascota (y de cualquier otra que ya comparta su
// mismo "hogar"). A propósito un enlace para copiar/compartir en vez de una
// invitación por email de Better Auth: no depende de que RESEND_API_KEY esté
// configurada (ver lib/env.ts) y funciona sin importar si esta mascota se
// activó por PIN o por cuenta — quien lo abre e inicia sesión (o ya tiene
// sesión) queda sumado como miembro real del hogar, que es justo la puerta
// de entrada para que una mascota activada por PIN empiece a tener dueños de
// verdad. Vence en 7 días (ver signOrgInviteToken).
export async function POST(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const token = signOrgInviteToken(check.pet.organizationId);
  // Absoluto a propósito: esto se comparte fuera de esta pantalla (WhatsApp,
  // email, lo que sea) — un link relativo ahí no apunta a ningún lado.
  const url = absoluteCrossSurfaceUrl("app", `/join/${token}`);
  return NextResponse.json({ url });
}
