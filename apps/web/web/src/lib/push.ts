import * as webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "@pettapp/db";

// Web Push estándar del navegador (RFC 8030), NO Firebase/APNs — no requiere
// ninguna cuenta de terceros ni gasto. Las claves VAPID son un par de claves
// propio (se generan una sola vez, gratis) que identifican a esta app ante
// los servicios push de cada navegador.
let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:soporte@pettapp.example";
  if (!publicKey || !privateKey) {
    throw new Error("Faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY para mandar notificaciones push.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // a dónde navega si tocan la notificación
}

/**
 * Manda una notificación a TODOS los dispositivos suscriptos del hogar
 * (organización) dueño de la mascota. Si un endpoint ya no es válido (410/404
 * — el usuario desinstaló o revocó permisos), lo borramos de la base en vez
 * de reintentarlo para siempre.
 */
export async function sendPushToOrganization(organizationId: string, payload: PushPayload): Promise<void> {
  ensureConfigured();

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(schema.pushSubscriptions.organizationId, organizationId),
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
        } else {
          console.error("Error mandando push:", err);
        }
      }
    }),
  );
}
