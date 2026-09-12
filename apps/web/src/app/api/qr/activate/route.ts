import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { activateTag, QrTagError } from "@/lib/qr";
import { randomUUID } from "node:crypto";

interface ActivateBody {
  publicToken: string;
  pet: {
    name: string;
    species: "dog" | "cat" | "other";
  };
}

// POST /api/qr/activate
// Activa una chapita sin asignar creando una mascota nueva para el usuario
// autenticado. (Asociar la chapita a una mascota YA existente — reemplazo —
// vive en /api/qr/replace, no acá: son dos flujos con reglas distintas.)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as ActivateBody;
  if (!body?.publicToken || !body?.pet?.name || !body?.pet?.species) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // Toda persona necesita un "hogar" (organization) antes de tener mascotas.
  // Si es la primera vez que activa algo, se lo creamos acá mismo.
  const orgs = await auth.api.listOrganizations({ headers: request.headers });
  let organizationId = orgs?.[0]?.id;
  if (!organizationId) {
    const created = await auth.api.createOrganization({
      headers: request.headers,
      body: { name: "Mi familia" },
    });
    organizationId = created.id;
  }

  const tag = await db.query.qrTags.findFirst({
    where: eq(schema.qrTags.publicToken, body.publicToken),
  });
  if (!tag) {
    return NextResponse.json({ error: "Chapita no encontrada" }, { status: 404 });
  }

  try {
    const petId = randomUUID();
    const slug = await uniqueSlugFor(body.pet.name);

    await db.transaction(async (tx) => {
      await tx.insert(schema.pets).values({
        id: petId,
        organizationId: organizationId!,
        slug,
        name: body.pet.name,
        species: body.pet.species,
      });

      const patch = activateTag(tag, petId); // lanza QrTagError si el estado no permite activar
      await tx.update(schema.qrTags).set(patch).where(eq(schema.qrTags.id, tag.id));
    });

    return NextResponse.json({ petSlug: slug }, { status: 201 });
  } catch (err) {
    if (err instanceof QrTagError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

async function uniqueSlugFor(name: string): Promise<string> {
  const base = name
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
