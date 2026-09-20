import { headers } from "next/headers";
import { desc, eq, ne, inArray } from "drizzle-orm";
import * as QRCode from "qrcode";
import { db, schema } from "@pettapp/db";
import { requireAdminSession } from "@/lib/authz";
import { scanUrlFor, absoluteCrossSurfaceUrl } from "@/lib/env";
import { signQrShareToken } from "@/lib/pin";
import { GenerateQrBatch } from "./GenerateQrBatch";
import { ReplaceTagForm } from "./ReplaceTagForm";
import { SharePendingButton } from "./SharePendingButton";
import styles from "../account.module.css";
import pageStyles from "./qr.module.css";

// Panel para generar chapitas de regalo/venta en lote y tener a mano el QR
// de cada una lista para imprimir. Restringido a operador (ver
// lib/authz.ts#requireAdminSession + lib/env.ts#ADMIN_EMAILS) en vez de
// "cualquier cuenta logueada" — la lista de activadas de abajo muestra
// mascotas de TODO el sistema, no solo las tuyas, así que no puede quedar
// abierta a cualquier cuenta el día que haya más de un cliente con cuenta
// propia.
//
// Dos paneles separados a propósito: "Para grabar" (sin asignar — el
// trabajo pendiente, con su QR listo para la imprenta) y "Activadas"
// (historial, sin generar ningún QR de más — no hace falta, esas chapitas
// ya están en la calle).
export default async function QrAdminPage() {
  const admin = await requireAdminSession(await headers());
  if (!admin.ok) {
    return (
      <main className={styles.page}>
        <p>{admin.status === 401 ? "Necesitás iniciar sesión." : "Esta cuenta no tiene acceso a este panel."}</p>
      </main>
    );
  }

  const pendingTags = await db.query.qrTags.findMany({
    where: eq(schema.qrTags.status, "unassigned"),
    orderBy: [desc(schema.qrTags.createdAt)],
  });

  const activatedTags = await db.query.qrTags.findMany({
    where: ne(schema.qrTags.status, "unassigned"),
    orderBy: [desc(schema.qrTags.createdAt)],
    limit: 60,
  });

  // Nombre de la mascota para cada chapita activada — un solo query en vez
  // de una por fila (activatedTags puede tener hasta 60).
  const petIds = [...new Set(activatedTags.map((t) => t.petId).filter((id): id is string => Boolean(id)))];
  const pets = petIds.length
    ? await db.query.pets.findMany({ where: inArray(schema.pets.id, petIds), columns: { id: true, name: true } })
    : [];
  const petNameById = new Map(pets.map((p) => [p.id, p.name]));

  const withQr = await Promise.all(
    pendingTags.map(async (tag) => ({
      ...tag,
      qrDataUrl: await QRCode.toDataURL(scanUrlFor(tag.publicToken), { margin: 1, width: 220 }),
    })),
  );

  // Enlace de 48hs para compartirle a quien hace el grabado láser, sin que
  // necesite cuenta acá (ver lib/pin.ts#signQrShareToken).
  const shareUrl =
    withQr.length > 0 ? absoluteCrossSurfaceUrl("app", `/qr/compartir/${signQrShareToken()}`) : null;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Chapitas</h1>
      <p className={styles.lead}>
        Generá el lote y compartí la plantilla con quien hace el grabado láser. Cada chapita empieza "sin asignar" —
        se vincula sola a una mascota cuando alguien la activa.
      </p>

      <GenerateQrBatch />

      <ReplaceTagForm />

      <section style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 className={styles.title} style={{ fontSize: "1.25rem", margin: 0 }}>
            Para grabar ({withQr.length})
          </h2>
          {shareUrl && <SharePendingButton url={shareUrl} count={withQr.length} />}
        </div>

        <ul className={pageStyles.grid}>
          {withQr.map((tag) => (
            <li key={tag.id} className={pageStyles.card}>
              <img src={tag.qrDataUrl} alt={`QR de la chapita ${tag.publicCode}`} width={160} height={160} />
              <span className={pageStyles.code}>{tag.publicCode}</span>
            </li>
          ))}
        </ul>
        {withQr.length === 0 && <p className={styles.hint}>No hay ninguna pendiente de grabar.</p>}
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 className={styles.title} style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>
          Activadas ({activatedTags.length})
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {activatedTags.map((tag) => (
            <li
              key={tag.id}
              style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", fontSize: "0.9rem" }}
            >
              <span className={pageStyles.code}>{tag.publicCode}</span>
              <span className={pageStyles.status}>{STATUS_LABEL[tag.status] ?? tag.status}</span>
              {tag.petId && petNameById.get(tag.petId) && <span>· {petNameById.get(tag.petId)}</span>}
            </li>
          ))}
        </ul>
        {activatedTags.length === 0 && <p className={styles.hint}>Todavía ninguna activada.</p>}
      </section>
    </main>
  );
}

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Sin asignar",
  active: "Activa",
  replaced: "Reemplazada",
  disabled: "Deshabilitada",
};
