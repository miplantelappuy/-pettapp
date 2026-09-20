import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { assertPetOwnership } from "@/lib/authz";

interface Body {
  action: "save" | "discard";
}

// POST /api/gifts/[giftId]/resolve
// El dueño "abre el sobre": guarda la foto en Recuerdos o la descarta. En
// los dos casos queda marcada como abierta (openedAt) para que deje de
// contar en el badge de "fotos nuevas" del Home.
export async function POST(request: NextRequest, { params }: { params: Promise<{ giftId: string }> }) {
  const { giftId } = await params;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (body?.action !== "save" && body?.action !== "discard") {
    return NextResponse.json({ error: "Falta acción" }, { status: 400 });
  }

  const gift = await db.query.petGifts.findFirst({ where: eq(schema.petGifts.id, giftId) });
  if (!gift) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // PIN (mascotas sin cuenta) o sesión + membresía (mascotas activadas con
  // cuenta desde /api/qr/claim, que nunca tuvieron PIN) — mismo chequeo que
  // ya usan las demás rutas de mascota.
  const ownership = await assertPetOwnership(request, gift.petId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  if (body.action === "save") {
    await db.insert(schema.petMedia).values({
      id: randomUUID(),
      petId: gift.petId,
      type: "photo",
      storageKey: gift.storageKey,
      caption: gift.senderNote,
    });
  }

  await db.update(schema.petGifts).set({ openedAt: new Date() }).where(eq(schema.petGifts.id, giftId));

  return NextResponse.json({ ok: true });
}
