import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import * as QRCode from "qrcode";
import { db, schema } from "@pettapp/db";
import { auth } from "@/lib/auth";
import { scanUrlFor } from "@/lib/env";
import { GenerateQrBatch } from "./GenerateQrBatch";
import styles from "../account.module.css";
import pageStyles from "./qr.module.css";

// Panel para generar chapitas de regalo/venta en lote y tener a mano el QR
// de cada una lista para imprimir. Gateado solo por sesión iniciada —
// alcanza mientras el único que entra acá sos vos probando el producto;
// antes de vender de verdad esto necesita un rol de admin de verdad, no
// "cualquier cuenta logueada".
export default async function QrAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <main className={styles.page}>
        <p>Necesitás iniciar sesión.</p>
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
