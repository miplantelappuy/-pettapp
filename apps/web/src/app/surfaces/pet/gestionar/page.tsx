import { headers } from "next/headers";
import * as QRCode from "qrcode";
import { getPetHomeData, getActiveTagToken, getLastSharedScan } from "@/lib/pets-data";
import { getVaccinations } from "@/lib/vaccinations-data";
import { getMilestones } from "@/lib/milestones-data";
import { getEmergencyFields } from "@/lib/emergency-fields-data";
import { getSurfacePrefix } from "@/lib/surface-prefix";
import { emergencyPath, scanUrlFor, GOOGLE_LOGIN_ENABLED, EMAIL_LOGIN_ENABLED } from "@/lib/env";
import { hasOwnerAccess } from "@/lib/pin";
import { PetPinGate } from "../PetPinGate";
import { ManagePet } from "../../account/pets/[petId]/ManagePet";

// Vive en la superficie de la mascota (no ya en /app/pets/<id>) porque
// originalmente el acceso era solo por PIN. hasOwnerAccess (lib/pin.ts)
// ahora acepta también sesión + membresía, para las mascotas vinculadas CON
// cuenta (ver /api/qr/claim) que nunca tuvieron PIN para empezar.
export default async function GestionarPage() {
  const hdrs = await headers();
  const slug = hdrs.get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  const prefix = await getSurfacePrefix();

  if (!pet) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>No encontramos esta mascota.</p>
      </main>
    );
  }

  const authorized = await hasOwnerAccess(pet.id, hdrs);
  if (!authorized) {
    return (
      <PetPinGate
        petId={pet.id}
        petName={pet.name}
        googleEnabled={GOOGLE_LOGIN_ENABLED}
        emailEnabled={EMAIL_LOGIN_ENABLED}
      />
    );
  }

  const vaccinations = await getVaccinations(pet.id);
  const milestones = await getMilestones(pet.id);
  const activeToken = await getActiveTagToken(pet.id);
  // El QR de verdad de SU chapita — lo que la persona escanea con la cámara
  // del celular para llegar acá. Mismo generador (qrcode) que ya usa
  // /app/qr, aplicado a la chapita real de esta mascota en vez de un lote.
  const qrDataUrl = activeToken ? await QRCode.toDataURL(scanUrlFor(activeToken), { margin: 1, width: 240 }) : null;
  const lastScan = await getLastSharedScan(pet.id);
  const emergencyFields = await getEmergencyFields(pet.id);

  return (
    <ManagePet
      petId={pet.id}
      initialPet={pet}
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
