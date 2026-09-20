import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import * as QRCode from "qrcode";
import { db, schema } from "@pettapp/db";
import { requireAdminSession } from "@/lib/authz";
import { scanUrlFor } from "@/lib/env";
import { GenerateQrBatch } from "./GenerateQrBatch";
import { ReplaceTagForm } from "./ReplaceTagForm";
import styles from "../account.module.css";
import pageStyles from "./qr.module.css";

// Panel para generar chapitas de regalo/venta en lote y tener a mano el QR
// de cada una lista para imprimir. Restringido a operador (ver
// lib/authz.ts#requireAdminSession + lib/env.ts#ADMIN_EMAILS) en vez de
// "cualquier cuenta logueada" — esta lista muestra las últimas 60 chapitas
// de TODO el sistema, no solo las tuyas, así que no puede quedar abierta a
// cualquier cuenta el día que haya más de un cliente con cuenta propia.
export default async function QrAdminPage() {
  const admin = await requireAdminSession(await headers());
  if (!admin.ok) {
    return (
      <main className={styles.page}>
        <p>{admin.status === 401 ? "Necesitás iniciar sesión." : "Esta cuenta no tiene acceso a este panel."}</p>
      </main>
    );
  }

  const tags = await db.query.qrTags.findMany({
    orderBy: [desc(schema.qrTags.createdAt)],
    limit: 60,
  });

  const withQr = await Promise.all(
    tags.map(async (tag) => ({
      ...tag,
      qrDataUrl: await QRCode.toDataURL(scanUrlFor(tag.publicToken), { margin: 1, width: 220 }),
    })),
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Chapitas</h1>
      <p className={styles.lead}>
        Generá el lote, imprimí esta pantalla (o guardá cada QR) y pegalas en las chapitas físicas. Cada una empieza
        "sin asignar" — se vincula sola a una mascota cuando alguien la activa en Tu familia.
      </p>

      <GenerateQrBatch />

      <ReplaceTagForm />

      <ul className={pageStyles.grid}>
        {withQr.map((tag) => (
          <li key={tag.id} className={pageStyles.card}>
            <img src={tag.qrDataUrl} alt={`QR de la chapita ${tag.publicCode}`} width={160} height={160} />
            <span className={pageStyles.code}>{tag.publicCode}</span>
            <span className={pageStyles.status}>{STATUS_LABEL[tag.status] ?? tag.status}</span>
          </li>
        ))}
        {tags.length === 0 && <p className={styles.hint}>Todavía no generaste ninguna.</p>}
      </ul>
    </main>
  );
}

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Sin asignar",
  active: "Activa",
  replaced: "Reemplazada",
  disabled: "Deshabilitada",
};
