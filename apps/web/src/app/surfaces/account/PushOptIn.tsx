"use client";

import { useEffect, useState } from "react";

// Activa notificaciones push del navegador (estándar, sin costo) para que
// la familia se entere al toque cuando alguien escanea la chapita de
// cualquiera de sus mascotas. Un solo botón: "Activar avisos".
export function PushOptIn({ organizationId }: { organizationId: string }) {
  const [status, setStatus] = useState<"idle" | "unsupported" | "asking" | "on" | "error">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
    }
  }, []);

  async function activate() {
    setStatus("asking");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus("error");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // El tipado de TS para PushManager.subscribe es más estricto que en
        // versiones anteriores y no acepta Uint8Array<ArrayBufferLike>
        // directamente — en runtime es exactamente lo que pide la API.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, subscription: subscription.toJSON() }),
      });

      setStatus("on");
    } catch {
      setStatus("error");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div style={{ margin: "1rem 0" }}>
      {status === "on" ? (
        <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>🔔 Avisos activados en este dispositivo.</p>
      ) : (
        <button type="button" onClick={activate} disabled={status === "asking"}>
          {status === "asking" ? "Activando…" : "🔔 Activar avisos cuando escaneen la chapita"}
        </button>
      )}
      {status === "error" && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-ember)" }}>
          No se pudo activar. Revisá los permisos de notificaciones del navegador.
        </p>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
