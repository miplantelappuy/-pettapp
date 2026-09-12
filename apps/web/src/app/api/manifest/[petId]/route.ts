import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";
import { getPetHomeData } from "@/lib/pets-data";
import { crossSurfaceUrl } from "@/lib/env";

// Manifest de Web App por MASCOTA (no uno solo para toda la app) — así,
// cuando el dueño la agrega a la pantalla de inicio, el ícono y el nombre
// que aparecen son los de SU mascota, no un logo genérico de PettApp.
// Pública y sin autenticación a propósito: es un archivo estático que lee
// el propio navegador al agregar el acceso directo, igual que cualquier
// manifest.json — nada acá es más sensible que lo que ya se ve en el
// perfil de emergencia público de la chapita.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;

  const pet = await db.query.pets.findFirst({ where: eq(schema.pets.id, petId) });
  if (!pet) return NextResponse.json({ error: "Mascota no encontrada" }, { status: 404 });

  const petData = await getPetHomeData(pet.slug);
  const iconUrl = petData?.iconUrl ?? null;

  const manifest = {
    name: `${pet.name} — PettApp`,
    short_name: pet.name,
    // Relativo a propósito: hoy (sin dominio propio) el panel vive en
    // /p/<slug> dentro del mismo host que este manifest; con dominio propio,
    // crossSurfaceUrl ya devuelve la URL del subdominio real.
    start_url: crossSurfaceUrl(pet.slug),
    scope: crossSurfaceUrl(pet.slug),
    display: "standalone",
    background_color: "#12100d",
    theme_color: "#12100d",
    icons: iconUrl
      ? [
          { src: iconUrl, sizes: "512x512", type: "image/jpeg", purpose: "any" },
          { src: iconUrl, sizes: "512x512", type: "image/jpeg", purpose: "maskable" },
        ]
      : [],
  };

  return NextResponse.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
