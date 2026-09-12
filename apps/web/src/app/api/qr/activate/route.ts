import { NextResponse, type NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { activateTag, QrTagError } from "@/lib/qr";
import { hashPin, signPetAccessToken, petAccessCookieName } from "@/lib/pin";

interface ActivateBody {
  // Acepta el código corto ("PET-000123") o el token opaco largo (el que va
  // en la URL del QR) — lo que la persona tenga a mano.
  code: string;
  pet: {
    name: string;
    species: "dog" | "cat" | "other";
  };
  // PIN que va a proteger su panel de dueño (ver lib/pin.ts). Reemplaza al
  // login por email para este flujo: activar una chapita ya NO requiere
  // cuenta ni sesión — la propia chapita física + este PIN son la barrera.
  pin: string;
}

const PIN_RE = /^\d{4,6}$/;

// POST /api/qr/activate
// Vincula una chapita sin asignar a una mascota nueva. A propósito SIN
// `auth.api.getSession`: activar ya no depende de tener una cuenta — quien
// compra la chapita física la escanea, carga a su mascota y un PIN, y ya
// tiene su panel. (El login por email de Better Auth sigue viviendo en
// /app por si más adelante hace falta una cuenta de verdad — hoy no es
// parte de este flujo.)
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ActivateBody | null;
  if (!body?.code || !body?.pet?.name || !body?.pet?.species || !body?.pin) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (!PIN_RE.test(body.pin)) {
    return NextResponse.json({ error: "El PIN tiene que tener entre 4 y 6 números." }, { status: 400 });
  }

  const tag = await db.query.qrTags.findFirst({
    where: or(eq(schema.qrTags.publicToken, body.code), eq(schema.qrTags.publicCode, body.code)),
  });
  if (!tag) {
    return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });
  }

  try {
    const petId = randomUUID();
    const organizationId = randomUUID();
    const slug = await uniqueSlugFor(body.pet.name);
    const pinHash = hashPin(body.pin);

    await db.transaction(async (tx) => {
      // Fila "hogar" invisible, solo para satisfacer la referencia que
      // pets.organizationId todavía exige — no hay cuenta ni miembros de
      // verdad detrás. El día que este producto tenga cuentas reales de
      // nuevo, esto se reemplaza por la organización real del usuario.
      await tx.insert(schema.organization).values({ id: organizationId, name: `Hogar de ${body.pet.name}` });

      await tx.insert(schema.pets).values({
        id: petId,
        organizationId,
        slug,
        name: body.pet.name,
        species: body.pet.species,
        managePinHash: pinHash,
      });

      const patch = activateTag(tag, petId); // lanza QrTagError si el estado no permite activar
      await tx.update(schema.qrTags).set(patch).where(eq(schema.qrTags.id, tag.id));
    });

    const res = NextResponse.json({ petSlug: slug, petId }, { status: 201 });
    // Quien acaba de activar la chapita entra directo, sin tener que escribir
    // el PIN que recién eligió — ver lib/pin.ts sobre la limitación de esta
    // cookie con subdominios reales (no aplica hoy).
    res.cookies.set(petAccessCookieName(petId), signPetAccessToken(petId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.BASE_PROTOCOL !== "http",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
    return res;
  } catch (err) {
    if (err instanceof QrTagError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

async function uniqueSlugFor(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // saca acentos
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "mascota";

  let candidate = base;
  let suffix = 1;
  while (await db.query.pets.findFirst({ where: eq(schema.pets.slug, candidate) })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}
