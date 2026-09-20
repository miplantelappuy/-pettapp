import { NextResponse, type NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import * as QRCode from "qrcode";
import { assertPetOwnership } from "@/lib/authz";
import { getPetHomeData, getActiveTagToken } from "@/lib/pets-data";
import { getEmergencyFields } from "@/lib/emergency-fields-data";
import { formatPetAge } from "@/lib/age";
import { scanUrlFor, urlFor } from "@/lib/env";

// Corre en Node (no Edge) — igual que el resto de la app (ver ffmpeg-static
// en video-compress.ts), para no depender de que el runtime Edge esté
// disponible tal cual en Railway.
export const runtime = "nodejs";

// satori (el motor de ImageResponse) hace su PROPIO fetch de cualquier <img
// src> del lado del servidor, sin ningún "origen actual" — por eso exige que
// sea una URL absoluta, y una relativa como la que devuelve el storage local
// (/api/media/local-read?key=...) lo tira abajo con "Image source must be an
// absolute URL". Además, satori tampoco respeta el tag EXIF de orientación
// que guardan la mayoría de los celulares (por eso la foto salía de costado
// en el cartel aunque se ve derecha en el resto de la app: un <img> de
// verdad en el navegador sí lo respeta, esto no). Se resuelve todo ACÁ, a
// mano, con sharp: se trae la foto, se "endereza" según su propio EXIF
// (.rotate() sin argumentos lo hace solo y de paso descarta el tag para que
// nadie la rote dos veces), se recorta a un cuadrado y se entrega como data
// URI en base64 — así satori nunca tiene que ir a buscarla ni interpretarla.
// Si algo de esto falla (foto corrupta, no encontrada), se sigue sin foto en
// vez de tirar abajo todo el cartel.
async function resolvePhotoDataUrl(url: string | null, size: number): Promise<string | null> {
  if (!url) return null;
  const absolute = url.startsWith("http") ? url : urlFor(null, url);
  try {
    const res = await fetch(absolute);
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    const upright = await sharp(original).rotate().resize(size, size, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${upright.toString("base64")}`;
  } catch {
    return null;
  }
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PHOTO_SIZE = 560;
const WIDTH = 1080;
const HEIGHT = 1500;

// Genera, al vuelo (no se guarda nada — cada descarga la arma de nuevo con
// los datos más recientes), una imagen lista para compartir cuando una
// mascota está en modo perdido. Formato vertical (pensado para pantalla de
// celular y para posts/historias, y que igual imprime razonablemente bien en
// una hoja) con la MISMA información que ve quien escanea la chapita: foto,
// datos básicos si el dueño eligió mostrarlos, alerta médica si hay,
// dónde se vio por última vez, contacto y el QR al perfil completo (los
// datos libres tipo "comportamiento" quedan solo en el perfil — son
// potencialmente muchos y no entran de forma legible en un cartel). Ojo con
// el texto propio de este archivo: a propósito SIN tildes ni emojis de
// verdad (el motor que dibuja la imagen —satori/next-og— no tiene
// garantizado el mismo soporte de fuentes/emoji que un navegador real, y acá
// no hay forma de previsualizar el resultado antes de que Facundo lo vea en
// producción) — lo que el dueño escribió (raza, zona, alerta médica) se
// muestra tal cual, eso no lo controlamos.
export async function GET(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const pet = check.pet;

  const petData = await getPetHomeData(pet.slug);
  const photoUrl = await resolvePhotoDataUrl(petData?.emergencyPhotoUrl ?? petData?.iconUrl ?? null, PHOTO_SIZE);
  const activeToken = await getActiveTagToken(petId);
  const qrDataUrl = activeToken ? await QRCode.toDataURL(scanUrlFor(activeToken), { margin: 1, width: 200 }) : null;
  const phone = petData?.emergencyContactPhone ?? pet.emergencyContactPhone;
  const contactName = petData?.emergencyContactName ?? null;

  const emergencyFields = await getEmergencyFields(petId);
  const medicalAlert = emergencyFields.find((f) => f.kind === "medical_alert") ?? null;

  const basicInfoChips: string[] = [];
  if (petData?.showBasicInfoPublic) {
    if (petData.breed) basicInfoChips.push(petData.breed);
    if (petData.sex === "male") basicInfoChips.push("Macho");
    if (petData.sex === "female") basicInfoChips.push("Hembra");
    const ageLabel = formatPetAge(petData.birthDate, petData.birthDatePrecision);
    if (ageLabel) basicInfoChips.push(ageLabel);
    if (petData.weightKg) basicInfoChips.push(`${Number(petData.weightKg)} kg`);
  }

  const lastSeenDate = formatShortDate(petData?.lostModeActivatedAt ?? null);
  const lostZone = petData?.lostZone ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 56px",
          background: "linear-gradient(160deg, #3a0d10 0%, #1c0507 70%, #100304 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              width: 42,
              height: 42,
              borderRadius: 999,
              background: "#e0424f",
              color: "#fff",
              fontSize: 26,
              fontWeight: 700,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            !
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 56, fontWeight: 700, letterSpacing: 3 }}>
            SE BUSCA
          </div>
          <div
            style={{
              display: "flex",
              width: 42,
              height: 42,
              borderRadius: 999,
              background: "#e0424f",
              color: "#fff",
              fontSize: 26,
              fontWeight: 700,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            !
          </div>
        </div>

        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) no usa next/image
          <img
            src={photoUrl}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            style={{ marginTop: 26, borderRadius: 32, border: "8px solid #ffffff", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              marginTop: 26,
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              borderRadius: 32,
              border: "8px solid #ffffff",
              background: "#3a0d10",
              flexShrink: 0,
            }}
          />
        )}

        <div style={{ display: "flex", color: "#ffffff", fontSize: 62, fontWeight: 700, marginTop: 22, flexShrink: 0 }}>
          {pet.name}
        </div>

        {basicInfoChips.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              marginTop: 14,
              flexShrink: 0,
              width: WIDTH - 112,
            }}
          >
            {basicInfoChips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "rgba(255,255,255,0.14)",
                  border: "2px solid rgba(255,255,255,0.28)",
                  borderRadius: 999,
                  padding: "8px 22px",
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        )}

        {medicalAlert && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              width: WIDTH - 112,
              background: "rgba(224,66,79,0.2)",
              border: "2px solid rgba(224,66,79,0.55)",
              borderRadius: 20,
              padding: "18px 24px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", color: "#ffc2c7", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
              Alerta medica
            </div>
            <div style={{ display: "flex", color: "#ffffff", fontSize: 27, lineHeight: 1.35 }}>
              {medicalAlert.value}
            </div>
          </div>
        )}

        {lostZone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              flexShrink: 0,
              width: WIDTH - 112,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: "#e0424f" }} />
            <div style={{ display: "flex", color: "rgba(255,255,255,0.9)", fontSize: 28, textAlign: "center" }}>
              Visto por ultima vez en {lostZone}
              {lastSeenDate ? ` (${lastSeenDate})` : ""}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 24,
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: 26 }}>
            Si la viste, avisa a su familia:
          </div>
          {contactName && (
            <div style={{ display: "flex", color: "#ffffff", fontSize: 30, fontWeight: 600 }}>{contactName}</div>
          )}
          {phone && (
            <div style={{ display: "flex", color: "#ffffff", fontSize: 44, fontWeight: 700 }}>{phone}</div>
          )}
        </div>

        {qrDataUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 26,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "16px 24px",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no next/image */}
            <img src={qrDataUrl} width={130} height={130} style={{ borderRadius: 8 }} />
            <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontSize: 23, maxWidth: 320 }}>
              Escanea el codigo para ver su perfil completo y contactar a la familia
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      // Sin esto, el navegador puede quedarse con la primera imagen que pidió
      // en esta URL (que no cambia entre versiones) y no volver a pedirla
      // nunca más — por eso después de la entrega anterior seguía viéndose
      // igual aunque el servidor ya generaba la versión nueva. El cartel se
      // arma de nuevo en cada pedido, así que nunca debería quedar en caché.
      headers: { "Cache-Control": "no-store, must-revalidate" },
    },
  );
}
