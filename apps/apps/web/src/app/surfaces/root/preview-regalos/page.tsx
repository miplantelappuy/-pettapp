import { RegalosClient } from "../../pet/regalos/RegalosClient";
import { PreviewBanner } from "../PreviewBanner";

// Vista previa del "sobre de figuritas" — dos regalos de muestra para
// mostrar la animación de apertura sin necesitar chapitas reales.
export default function PreviewRegalosPage() {
  return (
    <>
      <PreviewBanner />
      <RegalosClient
        petName="Milo"
        backHref="/preview-home"
        gifts={[
          { id: "demo-gift-1", url: "https://placedog.net/900/1200?id=21", note: "¡Lo encontramos jugando en la plaza!" },
          { id: "demo-gift-2", url: "https://placedog.net/900/1200?id=32", note: null },
        ]}
      />
    </>
  );
}
