import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import * as QRCode from "qrcode";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { getPetHomeData, getActiveTagToken, getLastSharedScan } from "@/lib/pets-data";
import { getVaccinations } from "@/lib/vaccinations-data";
import { getMilestones } from "@/lib/milestones-data";
import { getEmergencyFields } from "@/lib/emergency-fields-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { emergencyPath, scanUrlFor } from "@/lib/env";
import { ManagePet } from "./ManagePet";

export default async function ManagePetPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const hdrs = await headers();

  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) {
    return (
      <main style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p>Necesitás iniciar sesión para gestionar esta mascota.</p>
      </main>
    );
  }

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
  if (!pet) {
    return (
      <main style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p>Mascota no encontrada.</p>
      </main>
    );
  }

  const membership = await db.query.member.findFirst({
    where: and(eq(schema.member.organizationId, pet.organizationId), eq(schema.member.userId, session.user.id)),
  });
  if (!membership) {
    return (
      <main style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <p>No pertenecés a la familia de esta mascota.</p>
      </main>
    );
  }

  const petData = await getPetHomeData(pet.slug);
  if (!petData) return null;

  const vaccinations = await getVaccinations(petId);
  const milestones = await getMilestones(petId);
  const prefix = await getSurfacePrefix(); // "" con dominio propio, "/app" hoy sin uno
  const activeToken = await getActiveTagToken(petId);
  const qrDataUrl = activeToken ? await QRCode.toDataURL(scanUrlFor(activeToken), { margin: 1, width: 240 }) : null;
  const lastScan = await getLastSharedScan(petId);
  const emergencyFields = await getEmergencyFields(petId);

  return (
    <ManagePet
      petId={petId}
      initialPet={petData}
      initialVaccinations={vaccinations}
      initialMilestones={milestones}
      initialEmergencyFields={emergencyFields}
      accountHref={prefix || "/"}
      emergencyHref={activeToken ? emergencyPath(activeToken) : "/preview-emergency"}
      emergencyIsReal={Boolean(activeToken)}
      qrDataUrl={qrDataUrl}
      lastScan={lastScan}
    />
  );
}
