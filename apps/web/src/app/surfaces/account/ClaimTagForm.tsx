"use client";

import { useState } from "react";
import styles from "./account.module.css";

// Reemplaza a ActivateForm cuando ACCOUNT_LOGIN_READY está prendida (ver
// page.tsx): activar una chapita nueva ya no pide PIN, la protege la cuenta
// con la que ya estás logueado acá mismo. Es el equivalente de ClaimPetForm
// (superficie emergencia, /tag/<token>) pero para cuando alguien activa una
// chapita nueva desde SU PROPIO panel en vez de escaneándola por primera
// vez — por eso acá el código se escribe a mano en vez de venir de la URL.
// Mismo endpoint (/api/qr/claim), misma separación obligatorio/opcional.
export function ClaimTagForm() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<"dog" | "cat" | "other">("dog");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<"" | "male" | "female" | "unknown">("");
  const [weightKg, setWeightKg] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [medicalAlert, setMedicalAlert] = useState("");
  const [showBasicInfoPublic, setShowBasicInfoPublic] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    const res = await fetch("/api/qr/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        pet: {
          name,
          species,
          ownerName,
          phone,
          breed: breed || null,
          sex: sex || null,
          weightKg: weightKg ? Number(weightKg) : null,
          birthDate: birthDate || null,
          medicalAlert: medicalAlert || null,
          showBasicInfoPublic,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorMsg(body?.error ?? "No se pudo activar la chapita.");
      setStatus("error");
      return;
    }

    const { petSlug } = await res.json();
    window.location.href = `/p/${petSlug}`;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        placeholder="Código de tu chapita (ej: PET-000123)"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input placeholder="Nombre de tu mascota" required value={name} onChange={(e) => setName(e.target.value)} />
      <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat" | "other")}>
        <option value="dog">Perro</option>
        <option value="cat">Gato</option>
        <option value="other">Otro</option>
      </select>
      <input placeholder="Tu nombre" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      <input
        placeholder="Tu teléfono"
        required
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {!showOptional ? (
        <button type="button" onClick={() => setShowOptional(true)}>
          + Agregar más datos (opcional)
        </button>
      ) : (
        <>
          <p className={styles.hint} style={{ flexBasis: "100%", margin: 0 }}>
            Cuantos más datos cargues, más rápido va a poder ayudar a {name || "tu mascota"} quien la encuentre.
          </p>
          <input placeholder="Raza" value={breed} onChange={(e) => setBreed(e.target.value)} />
          <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
            <option value="">Sexo: prefiero no decir</option>
            <option value="male">Macho</option>
            <option value="female">Hembra</option>
            <option value="unknown">No lo sé</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="Peso (kg)"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <input
            type="date"
            aria-label="Fecha de nacimiento"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <input
            placeholder="Alerta médica (alergias, medicación)"
            value={medicalAlert}
            onChange={(e) => setMedicalAlert(e.target.value)}
          />
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              style={{ flex: "none", width: "auto" }}
              checked={showBasicInfoPublic}
              onChange={(e) => setShowBasicInfoPublic(e.target.checked)}
            />
            Mostrar raza/sexo/edad/peso en el perfil público
          </label>
        </>
      )}

      <button type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Activando…" : "Activar chapita"}
      </button>
      {status === "error" && <p className={styles.hint}>{errorMsg}</p>}
    </form>
  );
}
