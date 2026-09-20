import { NextResponse, type NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { activateTag, QrTagError } from "@/lib/qr";

// POST /api/qr/claim — la versión CON CUENTA de /api/qr/activate (que sigue
// existiendo tal cual para el flujo por PIN — no se toca). Se usa desde
// ClaimPetForm cuando ACCOUNT_REQUIRED_ON_ACTIVATION está prendido: en vez de
// un PIN elegido en el momento, quien activa ya inició sesión (email o
// Google), así que la mascota queda protegida por esa cuenta de verdad desde
// el día uno — con recuperación de acceso real y la posibilidad de sumar
// después a alguien más (ver /api/pets/[petId]/share-link).
interface ClaimBody {
  code: string;
  pet: {
    name: string;
    species: "dog" | "cat" | "other";
    ownerName: string;
    phone: string;
    // Todo lo de acá para abajo es opcional a propósito — el mensaje en
    // ClaimPetForm ya explica que cuantos más datos carguen mejor, pero
    // nada de esto debe bloquear la activación si se lo salta.
    breed?: string | null;
    sex?: "male" | "female" | "unknown" | null;
    weightKg?: number | null;
    birthDate?: string | null;
    medicalAlert?: string | null;
    showBasicInfoPublic?: boolean;
  };
}

const MAX_BREED = 60;
const MAX_WEIGHT_KG = 200;
const MAX_NAME = 60;
const MAX_MEDICAL_ALERT = 500;
const SEX_VALUES = new Set(["male", "female", "unknown"]);
const SPECIES_VALUES = new Set(["dog", "cat", "other"]);
const BIRTH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Necesitás iniciar sesión" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ClaimBody | null;
  const pet = body?.pet;
  if (!body?.code || !pet?.name || !pet?.species || !pet?.ownerName || !pet?.phone) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }
  if (pet.name.length > MAX_NAME || pet.ownerName.length > MAX_NAME) {
    return NextResponse.json({ error: "Ese nombre es demasiado largo" }, { status: 400 });
  }
  if (!SPECIES_VALUES.has(pet.species)) {
    return NextResponse.json({ error: "Especie inválida" }, { status: 400 });
  }
  if (pet.breed != null && pet.breed.length > MAX_BREED) {
    return NextResponse.json({ error: "La raza es demasiado larga" }, { status: 400 });
  }
  if (pet.sex != null && !SEX_VALUES.has(pet.sex)) {
    return NextResponse.json({ error: "Sexo inválido" }, { status: 400 });
  }
  if (pet.weightKg != null && (typeof pet.weightKg !== "number" || Number.isNaN(pet.weightKg) || pet.weightKg <= 0 || pet.weightKg > MAX_WEIGHT_KG)) {
    return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
  }
  if (pet.birthDate != null && !BIRTH_DATE_RE.test(pet.birthDate)) {
    return NextResponse.json({ error: "Fecha de nacimiento inválida" }, { status: 400 });
  }
  if (pet.medicalAlert != null && pet.medicalAlert.length > MAX_MEDICAL_ALERT) {
    return NextResponse.json({ error: "La alerta médica es demasiado larga" }, { status: 400 });
  }

  const tag = await db.query.qrTags.findFirst({
    where: or(eq(schema.qrTags.publicToken, body.code), eq(schema.qrTags.publicCode, body.code)),
  });
  if (!tag) {
    return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });
  }

  try {
    const petId = randomUUID();
    const slug = await uniqueSlugFor(pet.name);

    // "Hogar" del usuario: si ya es miembro de alguno (por ej. activó otra
    // chapita antes, o lo sumaron a la de otra persona), esta mascota nueva
    // se suma AHÍ — así una misma familia con varias mascotas las ve todas
    // juntas en /app en vez de terminar con un hogar invisible por cada una.
    // Si es la primera vez, se crea uno nuevo y esta persona queda como
    // "owner". Se usa el PRIMERO que aparezca a propósito (caso simple): si
    // más adelante alguien de verdad necesita manejar dos hogares distintos
    // sin mezclarlos, eso se resuelve aparte, no acá.
    const existingMembership = await db.query.member.findFirst({
      where: eq(schema.member.userId, session.user.id),
    });

    let organizationId: string;

    await db.transaction(async (tx) => {
      if (existingMembership) {
        organizationId = existingMembership.organizationId;
      } else {
        organizationId = randomUUID();
        await tx.insert(schema.organization).values({ id: organizationId, name: `Familia de ${pet.ownerName}` });
        await tx.insert(schema.member).values({
          id: randomUUID(),
          organizationId,
          userId: session.user.id,
          role: "owner",
        });
      }

      await tx.insert(schema.pets).values({
        id: petId,
        organizationId,
        slug,
        name: pet.name,
        species: pet.species,
        emergencyContactName: pet.ownerName,
        emergencyContactPhone: pet.phone,
        breed: pet.breed || null,
        sex: pet.sex || null,
        weightKg: pet.weightKg != null ? String(pet.weightKg) : null,
        birthDate: pet.birthDate || null,
        showBasicInfoPublic: Boolean(pet.showBasicInfoPublic),
      });

      if (pet.medicalAlert) {
        await tx.insert(schema.petEmergencyFields).values({
          id: randomUUID(),
          petId,
          kind: "medical_alert",
          label: "Alerta médica",
          value: pet.medicalAlert,
        });
      }

      const patch = activateTag(tag, petId); // lanza QrTagError si el estado no permite activar
      await tx.update(schema.qrTags).set(patch).where(eq(schema.qrTags.id, tag.id));
    });

    return NextResponse.json({ petSlug: slug, petId }, { status: 201 });
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
