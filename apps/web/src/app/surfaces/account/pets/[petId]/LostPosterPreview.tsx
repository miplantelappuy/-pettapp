"use client";

import { useState } from "react";
import styles from "./ManagePet.module.css";

interface Props {
  petId: string;
  petName: string;
}

// Antes esto era solo un <a download> — en el celular la imagen terminaba en
// la carpeta de Descargas de la app de Archivos, no en la galería de fotos,
// así que no se podía "mantener apretado y guardar" como con cualquier otra
// foto. Ahora la imagen se ve directamente en la pantalla (se puede
// mantener apretada ahí mismo) y además hay un botón "Compartir" que usa el
// selector nativo del teléfono (Web Share API) — desde ahí Android/iOS
// ofrecen guardarla directo en la galería, mandarla por WhatsApp, etc. La
// descarga clásica se deja como respaldo para navegadores de escritorio,
// donde no existe ningún selector nativo.
export function LostPosterPreview({ petId, petName }: Props) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const posterUrl = `/api/pets/${petId}/lost-poster`;
  const fileName = `${petName}-se-busca.png`;

  async function handleShare() {
    setShareError(null);
    setSharing(true);
    try {
      const res = await fetch(posterUrl);
      if (!res.ok) throw new Error("No se pudo generar la imagen");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Share API (share/canShare con files) todavía no está garantizada en lib.dom.d.ts en todas las versiones de TS
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: `${petName} se busca`,
          text: `Ayudanos a encontrar a ${petName}`,
        });
      } else {
        // Sin selector nativo (la mayoría de las computadoras) — cae a la
        // descarga clásica, con la imagen ya en memoria (no hace falta
        // pedirla de nuevo al servidor).
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // AbortError = la persona cerró el selector nativo sin elegir nada —
      // no es un error de verdad, no hace falta mostrar nada.
      if (err instanceof Error && err.name !== "AbortError") {
        setShareError('No se pudo compartir la imagen — probá con "Descargar".');
      }
    } finally {
      setSharing(false);
    }
  }

  // Abre una pestaña nueva con solo la imagen (nada del resto de la app) y
  // dispara el diálogo de impresión del navegador apenas termina de cargar
  // — desde ahí la persona puede imprimirla de verdad o guardarla como PDF,
  // según lo que le ofrezca su navegador/impresora. document.write en una
  // ventana en blanco abierta desde acá hereda este mismo origen, así que la
  // ruta relativa de la imagen (que además necesita la cookie del panel para
  // autenticarse) se resuelve y se manda igual que en cualquier <img> de
  // esta página.
  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return; // bloqueado por el navegador — no hay mucho más para hacer acá
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${petName} - se busca</title>
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      img { display: block; width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <img src="${posterUrl}" onload="window.print()" alt="${petName} se busca" />
  </body>
</html>`);
    printWindow.document.close();
  }

  return (
    <div className={styles.posterPreview}>
      <img
        src={posterUrl}
        alt={`Imagen para compartir que ${petName} está perdido/a`}
        className={styles.posterImage}
      />
      <p className={styles.hint} style={{ marginTop: "0.6rem" }}>
        Mantené el dedo apretado sobre la imagen para guardarla, o usá los botones de abajo.
      </p>
      <div className={styles.posterActions}>
        <button type="button" className="accentButton" onClick={handleShare} disabled={sharing}>
          {sharing ? "Abriendo…" : "📤 Compartir / Guardar"}
        </button>
        <a href={posterUrl} download={fileName} className="glassButton">
          💾 Descargar
        </a>
        <button type="button" className="glassButton" onClick={handlePrint}>
          🖨️ Imprimir
        </button>
      </div>
      {shareError && (
        <p className={styles.hint} style={{ color: "var(--color-danger)", marginTop: "0.5rem" }}>
          {shareError}
        </p>
      )}
    </div>
  );
}
