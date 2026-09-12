import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { verifyPinHash, signPetAccessToken, petAccessCookieName } from "@/lib/pin";

interface Body {
  pin: string;
}

// POST /api/pets/[petId]/verify-pin
// "Soy el dueño" en el perfil de emergencia lleva acá. Si el PIN coincide,
// deja una cookie firmada (60 días) para no tener que volver a pedirlo en
// ese mismo navegador. No hay límite de intentos todavía — para esta etapa
// (chapita física + PIN corto) alcanza, pero antes de vender de verdad
// convendría sumar un límite por IP/tiempo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.pin) {
    return NextResponse.json({ error: "Falta el PIN" }, { status: 400 });
  }

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
  if (!pet?.managePinHash || !verifyPinHash(body.pin, pet.managePinHash)) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(petAccessCookieName(petId), signPetAccessToken(petId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.BASE_PROTOCOL !== "http",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return res;
}
