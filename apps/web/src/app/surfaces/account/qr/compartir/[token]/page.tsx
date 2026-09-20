import { eq, desc } from "drizzle-orm";
import * as QRCode from "qrcode";
import { db, schema } from "@pettapp/db";
import { verifyQrShareToken } from "@/lib/pin";
import { scanUrlFor } from "@/lib/env";
import { PrintButton } from "./PrintButton";
import pageStyles from "../../qr.module.css";

// app.BASE_DOMAIN/qr/compartir/<token> — plantilla de chapitas "para grabar"
// (sin asignar), pensada para mandarle el link a quien hace el grabado
// láser: SIN login (no tiene cuenta acá) pero con un token que vence en 48hs
// (ver lib/pin.ts#signQrShareToken) en vez de ser una URL fija adivinable.
// A propósito solo lista "unassigned" — nunca chapitas ya activadas, que
// son de mascotas de verdad.
export default async function CompartirChapitasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!verifyQrShareToken(token)) {
    return (
      <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p>Este enlace venció o no es válido. Pedile a quien te lo mandó uno nuevo.</p>
      </main>
    );
  }

  const tags = await db.query.qrTags.findMany({
    where: eq(schema.qrTags.status, "unassigned"),
    orderBy: [desc(schema.qrTags.createdAt)],
  });

  const withQr = await Promise.all(
    tags.map(async (tag) => ({
      ...tag,
      qrDataUrl: await QRCode.toDataURL(scanUrlFor(tag.publicToken), { margin: 1, width: 260 }),
    })),
  );

  return (
    <main style={{ padding: "2rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}
      >
        <h1 style={{ margin: 0 }}>Chapitas para grabar ({withQr.length})</h1>
        <PrintButton />
      </div>

      <ul className={pageStyles.grid}>
        {withQr.map((tag) => (
          <li key={tag.id} className={pageStyles.card}>
            <img src={tag.qrDataUrl} alt={`QR de la chapita ${tag.publicCode}`} width={200} height={200} />
            <span className={pageStyles.code}>{tag.publicCode}</span>
          </li>
        ))}
      </ul>
      {withQr.length === 0 && <p>No hay chapitas pendientes de grabar en este momento.</p>}

      <style>{"@media print { .no-print { display: none; } }"}</style>
    </main>
  );
}
