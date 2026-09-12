import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { resolveScanView } from "@/lib/qr";

// tag.BASE_DOMAIN/t/{token} — perfil público de emergencia. Sin login, sin
// manifest de PWA, sin nada que la conecte visualmente con el dashboard
// privado: son superficies deliberadamente distintas (ver plan aprobado).
export default async function EmergencyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tag = await db.query.qrTags.findFirst({ where: eq(schema.qrTags.publicToken, token) });
  if (!tag) {
    return <main><p>Chapita no encontrada.</p></main>;
  }

  const pet = tag.petId
    ? await db.query.pets.findFirst({ where: eq(schema.pets.id, tag.petId) })
    : null;

  const view = resolveScanView(tag, pet ?? null);

  switch (view.view) {
    case "activation_pending":
      return (
        <main>
          <p>🐾 Esta chapita está esperando a su mascota.</p>
          <button>Activar mi chapita</button>
        </main>
      );
    case "tag_disabled":
      return <main><p>Esta chapita ya no está en uso.</p></main>;
    case "lost_mode":
      return (
        <main>
          <p>⚠️ {pet?.name} está perdido/a. Su familia lo está buscando.</p>
          <button>Compartir dónde lo encontraste</button>
        </main>
      );
    case "emergency_profile":
      return (
        <main>
          <p>Hola 🐾 Soy {pet?.name}. Creo que estoy perdido.</p>
          <button>Contactar a mi familia</button>
          <p><small>¿Sos el dueño? Entrar</small></p>
        </main>
      );
  }
}
