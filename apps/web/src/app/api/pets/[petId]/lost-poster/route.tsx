import { NextResponse, type NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import * as QRCode from "qrcode";
import { assertPetOwnership } from "@/lib/authz";
import { getPetHomeData, getActiveTagToken } from "@/lib/pets-data";
import { scanUrlFor } from "@/lib/env";

// Corre en Node (no Edge) — igual que el resto de la app (ver ffmpeg-static
// en video-compress.ts), para no depender de que el runtime Edge esté
// disponible tal cual en Railway.
export const runtime = "nodejs";

// Genera, al vuelo (no se guarda nada — cada descarga la arma de nuevo con
// los datos más recientes), una imagen lista para compartir en redes cuando
// una mascota está en modo perdido: foto, nombre, teléfono de contacto y un
// QR que lleva directo a su perfil de emergencia. Ojo con el texto: a
// propósito SIN tildes ni emojis (el motor que dibuja la imagen —
// satori/next-og— no tiene garantizado el mismo soporte de fuentes/emoji
// que un navegador de verdad, y no tenemos forma de previsualizar el
// resultado en este entorno antes de que Facundo lo vea en producción).
export async function GET(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const check = await assertPetOwnership(request, petId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
  const pet = check.pet;

  const petData = await getPetHomeData(pet.slug);
  const photoUrl = petData?.emergencyPhotoUrl ?? petData?.iconUrl ?? null;
  const activeToken = await getActiveTagToken(petId);
  const qrDataUrl = activeToken ? await QRCode.toDataURL(scanUrlFor(activeToken), { margin: 1, width: 200 }) : null;
  const phone = pet.emergencyContactPhone;

  const SIZE = 1080;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "56px 64px",
          background: "linear-gradient(160deg, #3a0d10 0%, #1c0507 70%, #100304 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 46,
              height: 46,
              borderRadius: 999,
              background: "#e0424f",
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            !
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 64, fontWeight: 700, letterSpacing: 4 }}>
            SE BUSCA
          </div>
          <div
            style={{
              display: "flex",
              width: 46,
              height: 46,
              borderRadius: 999,
              background: "#e0424f",
              color: "#fff",
              fontSize: 30,
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
            width={620}
            height={620}
            style={{
              marginTop: 40,
              borderRadius: 36,
              border: "10px solid #ffffff",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              marginTop: 40,
              width: 620,
              height: 620,
              borderRadius: 36,
              border: "10px solid #ffffff",
              background: "#3a0d10",
            }}
          />
        )}

        <div style={{ display: "flex", color: "#ffffff", fontSize: 72, fontWeight: 700, marginTop: 36 }}>
          {pet.name}
        </div>

        {phone && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 28,
              gap: 6,
            }}
          >
            <div style={{ display: "flex", color: "rgba(255,255,255,0.75)", fontSize: 28 }}>
              Si la viste, avisa a su familia:
            </div>
            <div style={{ display: "flex", color: "#ffffff", fontSize: 46, fontWeight: 700 }}>{phone}</div>
          </div>
        )}

        {qrDataUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 34,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "16px 24px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no next/image */}
            <img src={qrDataUrl} width={130} height={130} style={{ borderRadius: 8 }} />
            <div style={{ display: "flex", color: "rgba(255,255,255,0.85)", fontSize: 24, maxWidth: 320 }}>
              Escanea el codigo para ver su perfil y contactar a la familia
            </div>
          </div>
        )}
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
