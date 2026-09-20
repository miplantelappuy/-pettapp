"use client";

import { useState, useEffect } from "react";
import styles from "./emergency.module.css";

// Formulario post-login para vincular la chapita: solo se ve una vez que ya
// hay sesión iniciada (ver EmergencyPage/ClaimLoginGate). Separa a propósito
// lo obligatorio (lo mínimo para que el perfil de emergencia sirva de algo)
// de lo opcional (todo lo que ayuda a quien encuentre a la mascota, pero que
// no debería frenar a nadie que tenga apuro) — con un mensaje que explica
// POR QUÉ conviene cargar de más, no solo que "se puede".
export function ClaimPetForm({ token, justLoggedIn = false }: { token: string; justLoggedIn?: boolean }) {
  // Saca el ?login=ok de la barra de direcciones apenas se muestra el
  // aviso — así un refresh de esta misma pantalla no lo vuelve a mostrar.
  useEffect(() => {
    if (!justLoggedIn) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState({}, "", url.toString());
  }, [justLoggedIn]);

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
        code: token,
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
      setErrorMsg(body?.error ?? "No se pudo vincular la chapita.");
      setStatus("error");
      return;
    }

    const { petSlug, petId } = await res.json();

    // La foto es opcional y NO debería trabar la activación si algo sale
    // mal acá — la mascota ya quedó vinculada con lo mínimo, y la foto
    // siempre se puede cargar después desde Gestionar. Mismo mecanismo de
    // subida directa a R2 que usa ManagePet (POST upload-url, PUT el
    // archivo, y PATCH para elegirla como foto de emergencia — la que ve
    // quien escanea la chapita).
    if (photoFile) {
      try {
        const uploadRes = await fetch("/api/media/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petId, contentType: photoFile.type, kind: "photo" }),
        });
        if (uploadRes.ok) {
          const { uploadUrl, mediaId } = await uploadRes.json();
          await fetch(uploadUrl, { method: "PUT", body: photoFile, headers: { "Content-Type": photoFile.type } });
          await fetch(`/api/pets/${petId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emergencyPhotoMediaId: mediaId }),
          });
        }
      } catch {
        // Silencioso a propósito — ver comentario arriba.
      }
    }

    window.location.href = `/p/${petSlug}`;
  }

  return (
    <form className={`${styles.activateForm} glass`} onSubmit={handleSubmit}>
      {justLoggedIn && (
        <p className={styles.activateLead} style={{ color: "#2e7d46", fontWeight: 600, margin: 0 }}>
          ✅ Conectado correctamente.
        </p>
      )}
      <p className={styles.activateLead}>Ya iniciaste sesión — vinculemos esta chapita a tu mascota:</p>

      <label className={styles.field}>
        <span>Nombre de tu mascota</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Toby" />
      </label>

      <label className={styles.field}>
        <span>Especie</span>
        <select value={species} onChange={(e) => setSpecies(e.target.value as "dog" | "cat" | "other")}>
          <option value="dog">Perro</option>
          <option value="cat">Gato</option>
          <option value="other">Otro</option>
        </select>
      </label>

      <label className={styles.field}>
        <span>Tu nombre</span>
        <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ej: Facundo" />
      </label>

      <label className={styles.field}>
        <span>Tu teléfono</span>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ej: +59899123456"
        />
      </label>
      <p className={styles.pinHint}>
        Así, desde el primer momento, quien encuentre a {name || "tu mascota"} los puede contactar directamente.
      </p>

      {!showOptional ? (
        <button type="button" className="glassButton" onClick={() => setShowOptional(true)}>
          + Agregar más datos (opcional)
        </button>
      ) : (
        <>
          <p className={styles.pinHint} style={{ margin: 0 }}>
            Cuantos más datos cargues, más rápido va a poder ayudar a {name || "tu mascota"} quien la encuentre.
            Nada de esto es obligatorio, pero cada uno suma.
          </p>

          <label className={styles.field}>
            <span>Raza</span>
            <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Ej: Golden retriever" />
          </label>

          <label className={styles.field}>
            <span>Sexo</span>
            <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
              <option value="">Prefiero no decir</option>
              <option value="male">Macho</option>
              <option value="female">Hembra</option>
              <option value="unknown">No lo sé</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Peso (kg)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej: 12.5"
            />
          </label>

          <label className={styles.field}>
            <span>Fecha de nacimiento (o de llegada a tu familia)</span>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span>Alerta médica (alergias, condiciones, medicación)</span>
            <input
              value={medicalAlert}
              onChange={(e) => setMedicalAlert(e.target.value)}
              placeholder="Ej: alérgico a la penicilina"
            />
          </label>

          <label className={styles.field}>
            <span>Foto de {name || "tu mascota"} (la que va a ver quien escanee la chapita)</span>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>

          <label className={styles.field} style={{ flexDirection: "row", alignItems: "center", gap: "0.6rem" }}>
            <input
              type="checkbox"
              checked={showBasicInfoPublic}
              onChange={(e) => setShowBasicInfoPublic(e.target.checked)}
              style={{ width: "auto" }}
            />
            <span>Mostrar raza/sexo/edad/peso en el perfil público (podés cambiarlo después)</span>
          </label>
        </>
      )}

      <button type="submit" className="accentButton" disabled={status === "saving"}>
        {status === "saving" ? "Vinculando…" : "Vincular mi mascota"}
      </button>
      {status === "error" && <p className={styles.errorMsg}>{errorMsg}</p>}
    </form>
  );
}
