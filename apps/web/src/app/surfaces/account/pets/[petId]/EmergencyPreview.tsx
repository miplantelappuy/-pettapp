import styles from "./EmergencyPreview.module.css";

interface Props {
  petName: string;
  photoUrl: string | null;
  contactPhone: string | null;
  fields: { label: string; value: string }[];
}

// Espejo chico del perfil público real (ver
// surfaces/emergency/t/[token]/page.tsx) — no comparte código con esa
// pantalla a propósito: acá no hay escaneo, ni modo perdido, ni nada que
// dependa del servidor, es puro reflejo visual de lo que el dueño está
// escribiendo AHORA MISMO en el formulario de al lado, para que vea cómo va
// a quedar antes de guardar nada. Si mañana cambia el diseño real, este
// componente hay que actualizarlo a mano para que seudo sigan pareciéndose.
export function EmergencyPreview({ petName, photoUrl, contactPhone, fields }: Props) {
  return (
    <div className={styles.frame}>
      <div className={styles.notch} aria-hidden />
      <div className={styles.screen}>
        <div className={styles.heroWrap}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className={styles.photo} />
          ) : (
            <div className={styles.photoPlaceholder} aria-hidden />
          )}
        </div>

        <div className={styles.card}>
          <p className={styles.name}>Hola 🐾 Soy {petName || "tu mascota"}</p>
          <p className={styles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>

          {fields.length > 0 && (
            <div className={styles.fieldsList}>
              {fields.map((f, i) => (
                <div key={i} className={styles.fieldRow}>
                  <strong>{f.label || "(dato sin nombre)"}</strong>
                  <span>{f.value || "…"}</span>
                </div>
              ))}
            </div>
          )}

          {contactPhone ? (
            <div className={styles.actionRow}>
              <span className={styles.fakeButtonAccent}>📞 Llamar</span>
              <span className={styles.fakeButtonGlass}>💬 WhatsApp</span>
            </div>
          ) : (
            <p className={styles.hintMissing}>Todavía no cargaste un teléfono de contacto.</p>
          )}
        </div>
      </div>
      <p className={styles.caption}>Así lo ve quien encuentra a {petName || "tu mascota"} (vista previa)</p>
    </div>
  );
}
