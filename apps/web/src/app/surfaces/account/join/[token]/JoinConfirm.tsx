"use client";

import { useState } from "react";
import styles from "../../account.module.css";

export function JoinConfirm({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirm() {
    setStatus("saving");
    setErrorMsg(null);
    const res = await fetch("/api/org/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo aceptar la invitación.");
      setStatus("error");
      return;
    }
    window.location.href = "/app";
  }

  return (
    <div>
      <button type="button" className={styles.googleButton} onClick={handleConfirm} disabled={status === "saving"}>
        {status === "saving" ? "Sumando…" : "Aceptar y sumarme"}
      </button>
      {status === "error" && <p className={styles.hint}>{errorMsg}</p>}
    </div>
  );
}
