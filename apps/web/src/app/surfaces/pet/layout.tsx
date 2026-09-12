import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPetHomeData } from "@/lib/pets-data";

// Único propósito de este layout: que "agregar a la pantalla de inicio"
// desde cualquier pantalla de la mascota (Home, Gestionar, Crecimiento,
// Álbum...) muestre el NOMBRE y el ÍCONO de esa mascota en particular, no un
// logo genérico de PettApp. El manifest en sí (con el ícono ya resuelto,
// foto elegida por el dueño en Gestionar) vive en /api/manifest/[petId].
//
// apple-touch-icon + apple-mobile-web-app-title son la parte que de verdad
// importa en iPhone: Safari históricamente ignora el nombre/ícono del
// manifest.json al agregar a inicio y usa estos dos en su lugar — por eso
// van los dos caminos a la vez (metadata.icons.apple / metadata.appleWebApp)
// en lugar de confiar solo en el manifest para cubrir Android y iOS.
export async function generateMetadata(): Promise<Metadata> {
  const slug = (await headers()).get("x-pet-slug");
  const pet = slug ? await getPetHomeData(slug) : null;
  if (!pet) return {};

  return {
    title: pet.name,
    manifest: `/api/manifest/${pet.id}`,
    appleWebApp: {
      capable: true,
      title: pet.name,
      statusBarStyle: "black-translucent",
    },
    icons: pet.iconUrl ? { apple: pet.iconUrl } : undefined,
  };
}

export default function PetSurfaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
