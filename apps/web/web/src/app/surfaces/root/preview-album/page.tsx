import { getDemoPetHomeData } from "@/lib/demo-pet";
import { albumStyles, DEFAULT_ALBUM_STYLE } from "../../pet/recuerdos/album-styles/registry";
import { AlbumView } from "../../pet/recuerdos/AlbumView";
import { PreviewBanner } from "../PreviewBanner";

// Ídem preview-home, pero para el Álbum 3D. Ver ese archivo para el detalle
// de por qué existe esta ruta temporal.
//
// Acepta ?style=<id> para poder ver cualquier estilo del álbum sin depender
// de "Gestionar mascota" (que hoy solo cambia el estilo en memoria dentro de
// /preview-manage, sin que le llegue a esta página). Ej.: /preview-album o
// /preview-album?style=vintage-polaroid.
export default async function PreviewAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>;
}) {
  const { style } = await searchParams;
  const demoPet = getDemoPetHomeData();
  const templateId = style && albumStyles[style] ? style : DEFAULT_ALBUM_STYLE;
  return (
    <>
      <PreviewBanner />
      <AlbumView pet={{ ...demoPet, templateId }} backHref="/preview-home" />
    </>
  );
}
