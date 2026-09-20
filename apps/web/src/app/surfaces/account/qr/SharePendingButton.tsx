"use client";

// Comparte el link de la plantilla (todas las chapitas "para grabar") con
// quien te hace el grabado láser. navigator.share (menú nativo de compartir
// del celular/PC) cuando está disponible; si no, abre WhatsApp directo con
// el mensaje ya armado — funciona en cualquier navegador.
export function SharePendingButton({ url, count }: { url: string; count: number }) {
  async function handleShare() {
    const text = `Chapitas para grabar (${count}): ${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Chapitas para grabar", text, url });
        return;
      } catch {
        // Canceló el menú de compartir — no es un error, no hacer nada.
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className="glassButton" onClick={handleShare}>
      📤 Compartir plantilla para grabar
    </button>
  );
}
