import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { verifyOrgInviteToken } from "@/lib/pin";
import { GOOGLE_LOGIN_ENABLED, crossSurfaceUrl } from "@/lib/env";
import { LoginForm } from "../../LoginForm";
import { JoinWelcome } from "./JoinWelcome";
import styles from "../../account.module.css";

// app.BASE_DOMAIN/join/{token} — a donde llega quien recibió el enlace de
// "Compartir con otro dueño" (ver ManagePet > Compartir esta mascota y
// /api/pets/[petId]/share-link). A esta persona le llegó un link por
// WhatsApp y ya quiere entrar a ver a la mascota — pensada para eso, sin
// ninguna herramienta de administración de por medio (nada de generar
// chapitas ni "activar otra"): login, un pedido de avisos, y listo.
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const organizationId = verifyOrgInviteToken(token);

  if (!organizationId) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Este enlace no es válido</h1>
        <p className={styles.lead}>Puede que ya haya vencido (duran 7 días) — pedile a quien te lo mandó uno nuevo.</p>
      </main>
    );
  }

  const pets = await db.query.pets.findMany({ where: eq(schema.pets.organizationId, organizationId) });
  const mainPet = pets[0] ?? null;
  const petNames = pets.map((p) => p.name).join(", ") || "esta familia";

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Te invitaron a cuidar a {petNames}</h1>
        <p className={styles.lead}>Iniciá sesión para entrar:</p>
        <LoginForm callbackPath={crossSurfaceUrl("app", `/join/${token}`)} googleEnabled={GOOGLE_LOGIN_ENABLED} />
      </main>
    );
  }

  if (!mainPet) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Este enlace no es válido</h1>
        <p className={styles.lead}>No encontramos ninguna mascota para esta invitación.</p>
      </main>
    );
  }

  // Auto-aceptar apenas hay sesión: el link en sí (con el token de verdad,
  // vencido a los 7 días) ya ES el consentimiento — pedir un click más
  // ("Aceptar y sumarme") era fricción de más para alguien que solo quiere
  // entrar a ver a la mascota. Sin efecto si ya era miembro (ej. volvió a
  // abrir el mismo link después).
  const existing = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, session.user.id)),
  });
  if (!existing) {
    await db.insert(schema.member).values({
      id: randomUUID(),
      organizationId,
      userId: session.user.id,
      role: "member",
    });
  }

  return <JoinWelcome petId={mainPet.id} petName={mainPet.name} enterHref={crossSurfaceUrl(mainPet.slug)} />;
}
