import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { BASE_DOMAIN, BASE_PROTOCOL, HAS_CUSTOM_DOMAIN, GOOGLE_LOGIN_ENABLED } from "@/lib/env";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { PushOptIn } from "./PushOptIn";
import { LoginForm } from "./LoginForm";
import { ActivateForm } from "./ActivateForm";
import styles from "./account.module.css";

export default async function AccountPage() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  const prefix = await getSurfacePrefix();

  if (!session) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Tu familia</h1>
        <p className={styles.lead}>Ingresá con tu email para ver y gestionar tus mascotas.</p>
        <LoginForm googleEnabled={GOOGLE_LOGIN_ENABLED} />
      </main>
    );
  }

  // TypeScript no logra inferir el tipo del endpoint "listOrganizations" que
  // agrega el plugin organization (pasa con esta versión de better-auth,
  // aunque el método sí existe y funciona en tiempo de ejecución — ver
  // https://better-auth.com/docs/plugins/organization). Se tipa a mano acá
  // nomás, sin perder el chequeo de tipos en el resto del archivo.
  const orgApi = auth.api as unknown as {
    listOrganizations: (args: { headers: Headers }) => Promise<Array<{ id: string }> | null>;
  };
  const orgs = await orgApi.listOrganizations({ headers: hdrs });
  const organizationId = orgs?.[0]?.id;
  const pets = organizationId
    ? await db.query.pets.findMany({ where: eq(schema.pets.organizationId, organizationId) })
    : [];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Tu familia</h1>

      {pets[0] && <PushOptIn petId={pets[0].id} />}

      {pets.length > 0 && (
        <ul className={styles.petList}>
          {pets.map((pet) => {
            const petHref = HAS_CUSTOM_DOMAIN ? `${BASE_PROTOCOL}://${pet.slug}.${BASE_DOMAIN}` : `/p/${pet.slug}`;
            return (
              <li key={pet.id} className={styles.petCard}>
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petLinks}>
                  <a href={petHref}>Ver su app →</a>
                  <Link href={`${prefix}/pets/${pet.id}`}>Gestionar →</Link>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {pets.length === 0 ? "Activá tu primera chapita" : "¿Tenés otra chapita para activar?"}
        </h2>
        <p className={styles.hint}>
          El código viene impreso en la chapita física (o escaneá su QR — te lleva directo acá con el código ya
          cargado, cuando esa pantalla esté lista).
        </p>
        <ActivateForm tempPathMode={!HAS_CUSTOM_DOMAIN} baseDomain={BASE_DOMAIN} baseProtocol={BASE_PROTOCOL} />
      </section>

      <Link href={`${prefix}/qr`} className={styles.textLink}>
        Generar chapitas nuevas →
      </Link>
    </main>
  );
}
