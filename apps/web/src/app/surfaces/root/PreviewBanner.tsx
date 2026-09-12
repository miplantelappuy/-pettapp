// Cartel chico y honesto para dejar claro que esto es una vista previa con
// datos de muestra (Milo + fotos de stock), no la mascota real de nadie.
export function PreviewBanner() {
  return (
    <div
      style={{
        background: "var(--color-ink)",
        color: "var(--color-paper-light)",
        fontFamily: "var(--font-body)",
        fontSize: "0.8rem",
        textAlign: "center",
        padding: "0.5rem 1rem",
      }}
    >
      Vista previa con datos de muestra (Milo) — no es una mascota real todavía.
    </div>
  );
}
