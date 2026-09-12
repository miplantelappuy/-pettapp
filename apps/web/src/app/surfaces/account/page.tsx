import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { PushOptIn } from "./PushOptIn";

export default async function AccountPage() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    return (
      <main style={{ padding: "3rem 1.5rem", textAlign: "center", fontFamily: "var(--font-body)" }}>
        <h1 style={{ fontFamily: "var(--font-display)" }}>Tu cuenta</h1>
        <p>Iniciá sesión para ver y gestionar tus mascotas.</p>
      </main>
    );
  }

  const orgs = await auth.api.listOrganizations({ headers: hdrs });
  const organizationId = orgs?.[0]?.id;
  const pets = organizationId
    ? await db.query.pets.findMany({ where: eq(schema.pets.organizationId, organizationId) })
    : [];

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-body)" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Tu familia</h1>

      {organizationId && <PushOptIn organizationId={organizationId} />}

      {pets.length === 0 ? (
        <p>Todavía no activaste ninguna chapita.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {pets.map((pet) => (
            <li key={pet.id}>
              <Link href={`/pets/${pet.id}`}>Gestionar a {pet.name} →</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
