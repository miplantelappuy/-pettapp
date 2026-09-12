// Cartel chico y honesto para dejar claro que esto es una vista previa con
// datos de muestra (Milo + fotos de stock), no la mascota real de nadie.
export function PreviewBanner() {
  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.35)",
        color: "var(--color-cloud)",
        fontFamily: "var(--font-body)",
        fontSize: "0.8rem",
        textAlign: "center",
        padding: "0.5rem 1rem",
        position: "relative",
        zIndex: 3,
      }}
    >
      Vista previa con datos de muestra (Milo) — no es una mascota real todavía.
    </div>
  );
}
