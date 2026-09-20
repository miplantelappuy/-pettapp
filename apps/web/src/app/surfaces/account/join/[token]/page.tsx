import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { verifyOrgInviteToken } from "@/lib/pin";
import { GOOGLE_LOGIN_ENABLED } from "@/lib/env";
import { LoginForm } from "../../LoginForm";
import { JoinConfirm } from "./JoinConfirm";
import styles from "../../account.module.css";

// app.BASE_DOMAIN/join/{token} — a donde llega quien recibió un enlace de
// "Compartir con otro dueño" (ver ManagePet > Compartir esta mascota y
// /api/pets/[petId]/share-link). Muestra a QUIÉN se está por sumar (nombre
// de la/s mascota/s de ese hogar) antes de confirmar nada — igual que
// cualquier invitación real, no debería ser un click ciego.
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
  const petNames = pets.map((p) => p.name).join(", ") || "esta familia";

  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Te invitaron a cuidar a {petNames}</h1>
        <p className={styles.lead}>
          Iniciá sesión (con el email o la cuenta de Google que quieras usar) para aceptar la invitación.
        </p>
        <LoginForm callbackPath={`/join/${token}`} googleEnabled={GOOGLE_LOGIN_ENABLED} />
      </main>
    );
  }

  const existing = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, session.user.id)),
  });

  if (existing) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Ya formás parte</h1>
        <p className={styles.lead}>Ya podés gestionar a {petNames} desde tu cuenta.</p>
        <a href="/app" className={styles.textLink}>
          Ir a Tu familia →
        </a>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Te invitaron a cuidar a {petNames}</h1>
      <p className={styles.lead}>
        Al confirmar, vas a poder ver y gestionar {pets.length > 1 ? "estas mascotas" : "esta mascota"} desde tu
        propia cuenta, con los mismos permisos que quien te invitó.
      </p>
      <JoinConfirm token={token} />
    </main>
  );
}
