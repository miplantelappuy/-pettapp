"use client";

import { useEffect, useState } from "react";
import styles from "./emergency.module.css";

interface Props {
  token: string;
  petName: string;
  phone: string | null;
}

// Reemplaza a ScanReporter: además de avisar a la familia (con o sin
// ubicación, según lo que la persona que escaneó decida compartir en el
// diálogo nativo del navegador), ahora también arma el botón de WhatsApp acá
// mismo — porque el mensaje precargado necesita la MISMA ubicación que
// acabamos de conseguir, y hasta que no la tenemos el botón todavía no puede
// incluirla. Un solo lugar, un solo pedido de geolocalización.
export function EmergencyActions({ token, petName, phone }: Props) {
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "shared" | "denied" | "unsupported">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    report(token);

    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        report(token, latitude, longitude);
        setCoords({ lat: latitude, lng: longitude });
        setGeoStatus("shared");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const mapsUrl = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : null;
  const message = `¡Hola! Encontré a ${petName} 🐾${mapsUrl ? `. Mi ubicación: ${mapsUrl}` : ""}`;
  const waHref = phone ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` : null;

  return (
    <>
      {phone && waHref ? (
        <div className={styles.actionRow}>
          <a href={`tel:${phone}`} className="accentButton">
            📞 Llamar a mi familia
          </a>
          <a href={waHref} target="_blank" rel="noreferrer" className="glassButton">
            💬 WhatsApp
          </a>
        </div>
      ) : (
        <p className={styles.noPhone}>Su familia todavía no cargó un teléfono de contacto.</p>
      )}

      <p style={{ fontSize: "0.75rem", opacity: 0.65, margin: "0.75rem 0 0" }}>
        {geoStatus === "shared" && `Le avisamos a la familia de ${petName}, con tu ubicación aproximada. ¡Gracias! 🐾`}
        {geoStatus === "asking" && `Le avisamos a la familia de ${petName} que ${petName} apareció.`}
        {(geoStatus === "denied" || geoStatus === "unsupported" || geoStatus === "idle") &&
          `Le avisamos a la familia de ${petName}.`}
      </p>
    </>
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
