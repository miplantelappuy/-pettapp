"use client";

import { useEffect, useState } from "react";

// Avisa a la familia apenas se abre esta página (sin ubicación, para que la
// notificación les llegue YA) y después intenta conseguir la ubicación de
// quien escaneó — el navegador siempre muestra su propio diálogo de permiso
// nativo antes de compartir nada; si la persona lo rechaza o no responde, no
// pasa nada más. Nunca se manda nada sin que ese diálogo del navegador medie.
export function ScanReporter({ token, petName }: { token: string; petName: string }) {
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "shared" | "denied" | "unsupported">("idle");

  useEffect(() => {
    report(token);

    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        report(token, pos.coords.latitude, pos.coords.longitude);
        setGeoStatus("shared");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <p style={{ fontSize: "0.75rem", opacity: 0.65, margin: "0.75rem 0 0" }}>
      {geoStatus === "shared" && `Le avisamos a la familia de ${petName}, con tu ubicación aproximada. ¡Gracias! 🐾`}
      {geoStatus === "asking" && `Le avisamos a la familia de ${petName} que ${petName} apareció.`}
      {(geoStatus === "denied" || geoStatus === "unsupported" || geoStatus === "idle") &&
        `Le avisamos a la familia de ${petName}.`}
    </p>
  );
}

function report(token: string, lat?: number, lng?: number) {
  fetch("/api/qr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, lat, lng }),
    keepalive: true,
  }).catch(() => {
    // best-effort — si falla, no hay nada que mostrarle a quien encontró a
    // la mascota, ya está viendo el perfil de emergencia igual.
  });
}
