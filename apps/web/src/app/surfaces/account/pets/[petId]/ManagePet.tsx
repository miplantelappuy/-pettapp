"use client";

import { useState } from "react";
import Link from "next/link";
import type { PetHomeData, ResolvedMedia } from "@/lib/pets-data";
import type { VaccinationRow } from "@/lib/vaccinations-data";
import type { MilestoneRow } from "@/lib/milestones-data";
import type { EmergencyFieldRow } from "@/lib/emergency-fields-data";
import { albumStyles } from "@/app/surfaces/pet/recuerdos/album-styles/registry";
import { PushOptIn } from "../../PushOptIn";
import { EmergencyCardEditor } from "./EmergencyCardEditor";
import { LostPosterPreview } from "./LostPosterPreview";
import styles from "./ManagePet.module.css";

// Estilos ya nombrados en la visión del producto pero todavía no
// construidos — se muestran deshabilitados para que la arquitectura de
// "elegir estilo" ya se sienta completa, sin fingir que funcionan.
const PLANNED_STYLES = [
  { id: "elegante", label: "Elegante" },
  { id: "minimalista", label: "Minimalista" },
  { id: "acuarela", label: "Acuarela" },
  { id: "divertido", label: "Divertido / infantil" },
];

// Mismo tope que /api/media/upload-video — chequearlo acá antes de subir
// evita esperar toda la subida para recién ahí enterarse de que el archivo
// es demasiado pesado.
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

interface Props {
  petId: string;
  initialPet: PetHomeData;
  initialVaccinations: VaccinationRow[];
  /** El "camino de vida" de Crecimiento — opcional para no romper ningún
   * caller viejo que todavía no lo pasa. */
  initialMilestones?: MilestoneRow[];
  /** true en /preview-manage: todo pasa en memoria, nada se guarda de verdad
   * (no hay login ni mascota real todavía sin dominio propio). */
  demoMode?: boolean;
  /** Link de vuelta a "Tu familia" — ya viene con el prefijo correcto
   * (/app o "" según haya o no dominio propio) resuelto por quien llama. */
  accountHref?: string;
  /** A dónde apunta "Ver panel de emergencia": el perfil REAL (tag.BASE_DOMAIN/t/<token>)
   * si ya hay una chapita vinculada, o /preview-emergency como ejemplo si
   * todavía no. Resuelto por quien llama (server) — ver lib/pets-data.ts#getActiveTagToken. */
  emergencyHref?: string;
  /** true si emergencyHref apunta al perfil real (chapita ya vinculada), para
   * que el texto del link no prometa algo que todavía no existe. */
  emergencyIsReal?: boolean;
  /** El QR de verdad de la chapita ya vinculada, como data URL lista para
   * <img> (generado en el server con la librería "qrcode") — null si
   * todavía no hay ninguna chapita activa para esta mascota. */
  qrDataUrl?: string | null;
  /** La última vez que alguien escaneó la chapita activa y compartió su
   * ubicación (ver lib/pets-data.ts#getLastSharedScan) — null si nunca pasó
   * (todavía, o porque quien escaneó no la compartió esa vez). */
  lastScan?: { lat: number; lng: number; scannedAt: string } | null;
  /** Datos libres del perfil de emergencia (alergias, dirección, lo que sea)
   * — ver lib/emergency-fields-data.ts. */
  initialEmergencyFields?: EmergencyFieldRow[];
}

export function ManagePet({
  petId,
  initialPet,
  initialVaccinations,
  initialMilestones = [],
  demoMode = false,
  accountHref,
  emergencyHref = "/preview-emergency",
  emergencyIsReal = false,
  qrDataUrl = null,
  lastScan = null,
  initialEmergencyFields = [],
}: Props) {
  const [pet, setPet] = useState(initialPet);
  const [media, setMedia] = useState<ResolvedMedia[]>(initialPet.media);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>(initialVaccinations);
  const [milestones, setMilestones] = useState<MilestoneRow[]>(initialMilestones);
  const [emergencyFields, setEmergencyFields] = useState<EmergencyFieldRow[]>(initialEmergencyFields);
  const [savingFields, setSavingFields] = useState(false);
  const [lostZoneDraft, setLostZoneDraft] = useState(initialPet.lostZone ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);

  function flash(msg: string) {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 2000);
  }

  async function patchPet(patch: Record<string, unknown>) {
    setPet((p) => ({ ...p, ...patch }) as PetHomeData);
    if (demoMode) return flash("Guardado (vista previa, no se guarda de verdad)");
    setSaving(true);
    try {
      await fetch(`/api/pets/${petId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      flash("Guardado");
    } finally {
      setSaving(false);
    }
  }

  // La portada del Home ya no se elige a mano — ahora rota sola entre todas
  // las fotos y videos cada vez que se entra a la app (ver lib/pets-data.ts).
  // Lo que SÍ elige el dueño es la foto del perfil de emergencia (siempre
  // una foto, nunca un video — esa pantalla tiene que verse siempre).
  async function setEmergencyPhoto(mediaId: string) {
    setPet((p) => ({ ...p, emergencyPhotoMediaId: mediaId }) as PetHomeData);
    if (demoMode) return flash("Foto de emergencia actualizada (vista previa)");
    await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emergencyPhotoMediaId: mediaId }),
    });
    flash("Foto de emergencia actualizada");
  }

  // Qué foto usa el navegador como ícono cuando el dueño "agrega a la
  // pantalla de inicio" (ver surfaces/pet/layout.tsx + /api/manifest) — un
  // tercer rol posible para una foto, además de portada (ya no elegible) y
  // foto de emergencia.
  async function setAppIcon(mediaId: string) {
    setPet((p) => ({ ...p, iconMediaId: mediaId }) as PetHomeData);
    if (demoMode) return flash("Ícono de la app actualizado (vista previa)");
    await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iconMediaId: mediaId }),
    });
    flash("Ícono de la app actualizado");
  }

  async function removePhoto(mediaId: string) {
    setMedia((list) => list.filter((m) => m.id !== mediaId));
    if (demoMode) return;
    await fetch(`/api/pets/media/${mediaId}`, { method: "DELETE" });
  }

  async function addMediaFromFile(file: File) {
    // La portada puede ser foto O video (sin sonido, como pidió el dueño) —
    // un solo botón de "agregar", el tipo se detecta solo por el archivo
    // elegido en vez de pedir que la persona lo aclare a mano.
    const kind: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";

    if (demoMode) {
      const url = URL.createObjectURL(file);
      setMedia((list) => [
        ...list,
        {
          id: `local-${Date.now()}`,
          type: kind,
          url,
          posterUrl: null,
          caption: null,
          width: null,
          height: null,
          isProfileHero: list.length === 0,
          orderIndex: list.length,
        },
      ]);
      return;
    }

    if (kind === "video") {
      // El video pasa por nuestro servidor (no por una URL firmada directa
      // a R2 como la foto) porque acá se comprime con ffmpeg antes de
      // guardarlo — si no, un video de celular sin tocar puede pesar
      // cientos de MB y tardar una eternidad en cargar (o ni verse) en el
      // panel de cualquiera que visite a la mascota.
      if (file.size > MAX_VIDEO_BYTES) {
        return flash("El video pesa demasiado (máx. 300MB). Probá con un clip más corto.");
      }
      setProcessingVideo(true);
      try {
        const form = new FormData();
        form.append("petId", petId);
        form.append("file", file);
        const res = await fetch("/api/media/upload-video", { method: "POST", body: form });
        const body = await res.json().catch(() => null);
        if (!res.ok) return flash(body?.error ?? "No se pudo subir el video");
        setMedia((list) => [
          ...list,
          {
            id: body.mediaId,
            type: "video",
            url: body.readUrl,
            posterUrl: body.posterUrl ?? null,
            caption: null,
            width: null,
            height: null,
            isProfileHero: false,
            orderIndex: list.length,
          },
        ]);
        flash("Video subido y comprimido");
      } finally {
        setProcessingVideo(false);
      }
      return;
    }

    const res = await fetch("/api/media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, contentType: file.type, kind }),
    });
    if (!res.ok) return flash("No se pudo subir la foto");
    const { uploadUrl, mediaId, readUrl } = await res.json();
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    setMedia((list) => [
      ...list,
      {
        id: mediaId,
        type: kind,
        url: readUrl,
        posterUrl: null,
        caption: null,
        width: null,
        height: null,
        isProfileHero: false,
        orderIndex: list.length,
      },
    ]);
    flash("Foto subida — la miniatura se procesa en unos segundos");
  }

  async function addVaccination(name: string, appliedAt: string, nextDueAt: string) {
    if (demoMode) {
      setVaccinations((v) => [...v, { id: `local-${Date.now()}`, name, appliedAt, nextDueAt: nextDueAt || null, notes: null }]);
      return;
    }
    const res = await fetch(`/api/pets/${petId}/vaccinations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, appliedAt, nextDueAt: nextDueAt || null }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setVaccinations((v) => [...v, { id, name, appliedAt, nextDueAt: nextDueAt || null, notes: null }]);
    }
  }

  async function removeVaccination(id: string) {
    setVaccinations((v) => v.filter((row) => row.id !== id));
    if (demoMode) return;
    await fetch(`/api/pets/vaccinations/${id}`, { method: "DELETE" });
  }

  async function addMilestone(title: string, occurredOn: string, file: File) {
    const mediaType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";

    if (demoMode) {
      const mediaUrl = URL.createObjectURL(file);
      setMilestones((list) =>
        [...list, { id: `local-${Date.now()}`, title, occurredOn, mediaUrl, mediaType }].sort((a, b) =>
          a.occurredOn.localeCompare(b.occurredOn),
        ),
      );
      return;
    }
    if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
      return flash("El video pesa demasiado (máx. 300MB). Probá con un clip más corto.");
    }
    setSavingMilestone(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("occurredOn", occurredOn);
      form.append("file", file);
      const res = await fetch(`/api/pets/${petId}/milestones`, { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) return flash(body?.error ?? "No se pudo guardar el hito");
      setMilestones((list) =>
        [
          ...list,
          { id: body.id, title: body.title, occurredOn: body.occurredOn, mediaUrl: body.mediaUrl, mediaType: body.mediaType },
        ].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)),
      );
      flash("Hito agregado al camino");
    } finally {
      setSavingMilestone(false);
    }
  }

  async function removeMilestone(id: string) {
    setMilestones((list) => list.filter((m) => m.id !== id));
    if (demoMode) return;
    await fetch(`/api/pets/milestones/${id}`, { method: "DELETE" });
  }

  // Modo perdido: lo único que activa/desactiva la alerta pública (ver
  // resolveScanView en lib/qr.js) — quien escanea la chapita mientras está
  // activo ve la pantalla de alerta a pantalla completa en vez del perfil
  // normal. Pide confirmación en los dos sentidos porque las dos direcciones
  // tienen consecuencias reales: activarlo dispara una alerta que va a ver
  // cualquiera que escanee, y desactivarlo la apaga aunque la mascota siga
  // perdida.
  async function toggleLostMode() {
    const next = !pet.lostMode;
    const zone = next ? lostZoneDraft.trim() || null : null;
    const confirmMsg = next
      ? `¿Marcar a ${pet.name} como perdido/a? Quien escanee su chapita va a ver una alerta a pantalla completa hasta que lo desactives.`
      : `¿Marcar que ${pet.name} ya apareció? Se apaga la alerta en su perfil público.`;
    if (!window.confirm(confirmMsg)) return;

    setPet(
      (p) => ({ ...p, lostMode: next, lostModeActivatedAt: next ? new Date().toISOString() : null, lostZone: zone }) as PetHomeData,
    );
    if (!next) setLostZoneDraft("");
    if (demoMode) return flash(next ? "Modo perdido activado (vista previa)" : "Modo perdido desactivado (vista previa)");
    await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lostMode: next, lostZone: zone }),
    });
    flash(next ? "Modo perdido activado" : `¡Qué alegría! Modo perdido desactivado`);
  }

  // Email opcional para avisos de escaneo, además del push (ver lib/email.ts
  // — necesita RESEND_API_KEY/EMAIL_FROM configuradas en Railway para
  // mandar de verdad, si no solo queda en el registro del servidor). El
  // servidor valida el formato — si lo rechaza, se lo mostramos al dueño en
  // vez de fingir que se guardó.
  async function saveNotifyEmail(email: string) {
    const trimmed = email.trim();
    setPet((p) => ({ ...p, notifyEmail: trimmed || null }) as PetHomeData);
    if (demoMode) return flash("Guardado (vista previa, no se guarda de verdad)");
    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyEmail: trimmed || null }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return flash(body?.error ?? "No se pudo guardar el email");
    flash("Email de avisos guardado");
  }

  // Fecha de nacimiento (o de llegada a la familia, si no se sabe la real) —
  // solo alimenta la frase de edad y la cuenta regresiva de cumpleaños del
  // Home (ver lib/age.ts), no tiene ningún otro efecto. birthDatePrecision
  // deja avisar cuando no se sabe el día exacto (muchas mascotas son
  // adoptadas): la cuenta regresiva igual usa el mes/día tal cual estén
  // cargados, aclarando en el propio formulario que va a ser aproximada.
  async function saveBirthDate(birthDate: string, precision: string) {
    setPet((p) => ({ ...p, birthDate: birthDate || null, birthDatePrecision: precision }) as PetHomeData);
    if (demoMode) return flash("Guardado (vista previa, no se guarda de verdad)");
    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: birthDate || null, birthDatePrecision: precision }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return flash(body?.error ?? "No se pudo guardar la fecha");
    flash("Fecha de nacimiento guardada");
  }

  // Raza/sexo/peso — "de ficha", separados de la fecha de nacimiento porque
  // ya tenía su propia sección — con un solo interruptor que decide si
  // aparecen (junto con la edad, calculada de la fecha de nacimiento) en el
  // perfil público de emergencia. Mismo criterio que el resto del panel: un
  // solo botón guarda todo junto.
  async function saveBasicInfo(breed: string, sex: string, weightKg: string, showPublic: boolean) {
    const trimmedBreed = breed.trim() || null;
    const sexValue = sex || null;
    const weightNum = weightKg.trim() ? Number(weightKg) : null;
    setPet(
      (p) =>
        ({
          ...p,
          breed: trimmedBreed,
          sex: sexValue,
          weightKg: weightNum !== null ? String(weightNum) : null,
          showBasicInfoPublic: showPublic,
        }) as PetHomeData,
    );
    if (demoMode) return flash("Guardado (vista previa, no se guarda de verdad)");
    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ breed: trimmedBreed, sex: sexValue, weightKg: weightNum, showBasicInfoPublic: showPublic }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return flash(body?.error ?? "No se pudieron guardar los datos");
    flash("Datos guardados");
  }

  // Datos libres del perfil de emergencia (alergias, dirección, lo que se
  // le ocurra al dueño). Se editan todos en memoria — EmergencyCardEditor ya
  // ES el diseño real, así que cada tecla se ve reflejada ahí mismo, ANTES
  // de guardar nada. id temporal con crypto.randomUUID() para las filas
  // nuevas: solo se usa como key de React y para encontrar la fila al
  // editar/borrar, el id de verdad lo asigna el server recién al guardar.
  function addEmergencyField(kind: "medical_alert" | "custom") {
    setEmergencyFields((list) => [
      ...list,
      { id: crypto.randomUUID(), kind, label: kind === "medical_alert" ? "Alerta médica" : "", value: "" },
    ]);
  }

  function updateEmergencyField(id: string, patch: Partial<Pick<EmergencyFieldRow, "label" | "value">>) {
    setEmergencyFields((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeEmergencyField(id: string) {
    setEmergencyFields((list) => list.filter((f) => f.id !== id));
  }

  // Un solo botón guarda TODO el perfil de emergencia de una — el contacto
  // (nombre/teléfono) y los datos libres (alergias, dirección, etc.) — para
  // que se sienta como una sola pantalla que se edita y se guarda, no dos
  // formularios separados con dos botones. Las dos llamadas van en paralelo
  // porque son endpoints distintos (PATCH de la mascota vs. PUT de sus
  // datos libres) que no dependen una de la otra.
  async function saveEmergencyCard(name: string, phone: string) {
    setPet((p) => ({ ...p, emergencyContactName: name || null, emergencyContactPhone: phone || null }) as PetHomeData);
    if (demoMode) return flash("Guardado (vista previa, no se guarda de verdad)");
    setSavingFields(true);
    try {
      const [contactRes, fieldsRes] = await Promise.all([
        fetch(`/api/pets/${petId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emergencyContactName: name || null, emergencyContactPhone: phone || null }),
        }),
        fetch(`/api/pets/${petId}/emergency-fields`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: emergencyFields.map(({ kind, label, value }) => ({ kind, label, value })) }),
        }),
      ]);
      const fieldsBody = await fieldsRes.json().catch(() => null);
      if (!fieldsRes.ok) return flash(fieldsBody?.error ?? "No se pudieron guardar los datos");
      // El server ignora filas vacías a medio completar — reflejamos lo que
      // de verdad quedó guardado (con ids de verdad) en vez de lo que había
      // en el formulario.
      setEmergencyFields(
        (fieldsBody.fields as { kind: "medical_alert" | "custom"; label: string; value: string }[]).map((f) => ({
          id: crypto.randomUUID(),
          ...f,
        })),
      );
      if (!contactRes.ok) return flash("Se guardaron los datos, pero no el contacto");
      flash("Perfil de emergencia guardado");
    } finally {
      setSavingFields(false);
    }
  }

  return (
    <div className={styles.page}>
      {demoMode && (
        <div className={styles.demoBanner}>
          Vista previa — los cambios acá NO se guardan de verdad (no hay mascota real todavía).
        </div>
      )}

      {accountHref && (
        <Link href={accountHref} className={styles.backLink}>
          ← Volver a mi cuenta
        </Link>
      )}

      <h1 className={styles.title}>Gestionar a {pet.name}</h1>
      {savedFlash && <div className={styles.flash}>{savedFlash}</div>}

      {/* ── Modo perdido ── */}
      <section className={`${styles.section} glass ${pet.lostMode ? styles.sectionAlert : ""}`}>
        <h2 className={styles.sectionTitle}>{pet.lostMode ? "🚨 En modo perdido" : "Modo perdido"}</h2>
        <p className={styles.hint}>
          {pet.lostMode
            ? `El perfil público de ${pet.name} está mostrando una alerta a pantalla completa a quien escanee su chapita. Desactivalo apenas aparezca.`
            : `Si ${pet.name} se perdió, activalo acá: quien escanee su chapita va a ver una alerta bien visible en vez del perfil normal, y vas a poder descargar una imagen lista para compartir en redes.`}
        </p>

        {pet.lostMode ? (
          pet.lostZone && (
            <p className={styles.hint} style={{ marginTop: "-0.5rem" }}>
              📍 Zona informada: <strong>{pet.lostZone}</strong>
            </p>
          )
        ) : (
          <input
            type="text"
            className={styles.lostZoneInput}
            placeholder="Zona donde se perdió (opcional, ej: Barrio Centro)"
            value={lostZoneDraft}
            onChange={(e) => setLostZoneDraft(e.target.value)}
            maxLength={120}
          />
        )}

        <button
          type="button"
          className={pet.lostMode ? "glassButton" : "accentButton"}
          onClick={toggleLostMode}
        >
          {pet.lostMode ? `✅ Marcar que ${pet.name} ya apareció` : `🚨 Marcar a ${pet.name} como perdido/a`}
        </button>
        {pet.lostMode && !demoMode && <LostPosterPreview petId={petId} petName={pet.name} />}
      </section>

      {/* ── Cumpleaños ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>🎂 Cumpleaños</h2>
        <p className={styles.hint}>
          Cargá la fecha de nacimiento (o de llegada a la familia) de {pet.name} para activar la cuenta regresiva en
          el Home. Si no sabés el día exacto, elegí &quot;Solo el mes&quot; o &quot;Solo el año&quot; — igual vas a
          ver la cuenta regresiva, aclarando que es aproximada.
        </p>
        <BirthdayForm
          birthDate={pet.birthDate ?? ""}
          precision={pet.birthDatePrecision ?? "exact"}
          onSave={saveBirthDate}
        />
      </section>

      {/* ── Datos básicos ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>🐾 Datos básicos</h2>
        <p className={styles.hint}>
          Raza, sexo y peso de {pet.name} — opcionales. Si querés, podés mostrarlos (junto con la edad) en el perfil
          de emergencia, para que quien encuentre a {pet.name} tenga más para reconocerla.
        </p>
        <BasicInfoForm
          breed={pet.breed ?? ""}
          sex={pet.sex ?? ""}
          weightKg={pet.weightKg ?? ""}
          showPublic={pet.showBasicInfoPublic}
          onSave={saveBasicInfo}
        />
      </section>

      {/* ── Avisos ── */}
      {!demoMode && (
        <section className={`${styles.section} glass`}>
          <h2 className={styles.sectionTitle}>Avisos</h2>
          <p className={styles.hint}>
            Activalo en este teléfono para enterarte al toque cuando alguien escanee la chapita de {pet.name} — con su
            ubicación aproximada, cuando la persona que la encontró decida compartirla.
          </p>
          <PushOptIn petId={petId} />
          <div style={{ marginTop: "0.85rem" }}>
            <p className={styles.hint}>
              Además del push, podés recibir un email cada vez que escaneen la chapita de {pet.name} (con la
              ubicación, cuando la compartan).
            </p>
            <NotifyEmailForm email={pet.notifyEmail ?? ""} onSave={saveNotifyEmail} />
          </div>
          {lastScan && (
            <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
              📍 Última ubicación compartida: {new Date(lastScan.scannedAt).toLocaleString("es-UY")} —{" "}
              <a
                href={`https://maps.google.com/?q=${lastScan.lat},${lastScan.lng}`}
                target="_blank"
                rel="noreferrer"
                className={styles.panelLink}
              >
                Ver en Google Maps →
              </a>
            </p>
          )}
        </section>
      )}

      {/* ── Fotos y videos ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Fotos y videos</h2>
        <p className={styles.hint}>
          La portada del Home puede ser una foto o un video (se reproduce sin sonido, se recorta a los primeros 20
          segundos y se comprime automáticamente para que cargue rápido) — ya no se elige a mano: rota sola entre
          todo lo que cargues, así el Home nunca se siente igual dos veces. Los videos acá abajo no se reproducen
          solos (para no enlentecer la app a medida que sumes más) — tocalos para verlos. Marcá una foto como 🚨
          Emergencia o 📱 Ícono para elegir cuál usar en cada caso (una foto cuadrada se ve mejor como ícono).
        </p>
        <div className={styles.photoGrid}>
          {media.map((m) => (
            <div key={m.id} className={styles.photoCard}>
              {m.type === "video" ? (
                <video src={m.url} poster={m.posterUrl ?? undefined} muted playsInline controls preload="none" />
              ) : (
                <img src={m.url} alt="" />
              )}
              <div className={styles.photoTags}>
                {pet.emergencyPhotoMediaId === m.id && <span className={styles.heroTag}>🚨 Emergencia</span>}
                {pet.iconMediaId === m.id && <span className={styles.heroTag}>📱 Ícono</span>}
              </div>
              <div className={styles.photoActions}>
                {m.type === "photo" && pet.emergencyPhotoMediaId !== m.id && (
                  <button type="button" onClick={() => setEmergencyPhoto(m.id)}>
                    🚨 Emergencia
                  </button>
                )}
                {m.type === "photo" && pet.iconMediaId !== m.id && (
                  <button type="button" onClick={() => setAppIcon(m.id)}>
                    📱 Ícono
                  </button>
                )}
                <button type="button" onClick={() => removePhoto(m.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <label className={styles.addPhoto} aria-disabled={processingVideo}>
            {processingVideo ? "Comprimiendo video…" : "+ Agregar foto o video"}
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              disabled={processingVideo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addMediaFromFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      {/* ── Estilo de álbum ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Estilo del álbum</h2>
        <div className={styles.styleGrid}>
          {Object.values(albumStyles).map((style) => (
            <button
              key={style.id}
              type="button"
              className={`${styles.styleOption} ${pet.templateId === style.id ? styles.styleOptionActive : ""}`}
              onClick={() => patchPet({ templateId: style.id })}
            >
              {style.label}
            </button>
          ))}
          {PLANNED_STYLES.map((style) => (
            <span key={style.id} className={`${styles.styleOption} ${styles.styleOptionSoon}`}>
              {style.label}
              <em>pronto</em>
            </span>
          ))}
        </div>
      </section>

      {/* ── Perfil de emergencia — editable directamente sobre su diseño real ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Perfil de emergencia</h2>
        <p className={styles.hint}>
          Esto es exactamente lo que ve quien escanea la chapita física de {pet.name} — tocá cualquier dato para
          editarlo. La foto es la marcada como 🚨 Emergencia arriba en &quot;Fotos y videos&quot;.
        </p>

        <EmergencyCardEditor
          petName={pet.name}
          photoUrl={pet.emergencyPhotoUrl}
          breed={pet.breed}
          sex={pet.sex}
          weightKg={pet.weightKg}
          birthDate={pet.birthDate}
          birthDatePrecision={pet.birthDatePrecision}
          showBasicInfoPublic={pet.showBasicInfoPublic}
          contactName={pet.emergencyContactName ?? ""}
          contactPhone={pet.emergencyContactPhone ?? ""}
          fields={emergencyFields}
          saving={savingFields}
          onAddField={addEmergencyField}
          onUpdateField={updateEmergencyField}
          onRemoveField={removeEmergencyField}
          onSave={saveEmergencyCard}
        />

        <a href={emergencyHref} target="_blank" rel="noreferrer" className={styles.panelLink}>
          {emergencyIsReal
            ? `Ver el panel de emergencia de ${pet.name} →`
            : "Ver un ejemplo (todavía no vinculaste una chapita) →"}
        </a>
      </section>

      {/* ── Chapita / QR ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Tu chapita</h2>
        {qrDataUrl ? (
          <>
            <p className={styles.hint}>
              Este es el código de la chapita de {pet.name} — escaneálo con la cámara del celular (la de fotos
              normal, no hace falta ninguna app) para probar exactamente lo que ve alguien que la encuentra.
            </p>
            <img src={qrDataUrl} alt={`Código QR de la chapita de ${pet.name}`} width={180} height={180} />
          </>
        ) : (
          <p className={styles.hint}>
            Todavía no tenés una chapita vinculada a {pet.name} — entrá a{" "}
            <a href="/panel" className={styles.panelLink}>
              /panel
            </a>{" "}
            y usá &quot;Crear chapita de prueba&quot; para generar una.
          </p>
        )}
      </section>

      {/* ── Vacunas ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Vacunas</h2>
        <ul className={styles.vaccineList}>
          {vaccinations.map((v) => (
            <li key={v.id} className={styles.vaccineRow}>
              <span>
                <strong>{v.name}</strong> — {v.appliedAt}
                {v.nextDueAt && <> · próxima: {v.nextDueAt}</>}
              </span>
              <button type="button" onClick={() => removeVaccination(v.id)}>
                Eliminar
              </button>
            </li>
          ))}
          {vaccinations.length === 0 && <li className={styles.hint}>Todavía no cargaste ninguna.</li>}
        </ul>
        <VaccinationForm onAdd={addVaccination} />
      </section>

      {/* ── Crecimiento (camino de vida) ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Crecimiento</h2>
        <p className={styles.hint}>
          Los momentos importantes de la vida de {pet.name} — arman el camino que se ve en el Home, desde que llegó a
          la familia hasta hoy. Cada uno lleva una foto o video, una fecha y un título corto. También podés agregarlos
          directamente tocando una burbuja vacía en el camino, sin pasar por acá.
        </p>
        <ul className={styles.vaccineList}>
          {milestones.map((m) => (
            <li key={m.id} className={styles.vaccineRow}>
              <span className={styles.milestoneInfo}>
                {m.mediaType === "video" ? (
                  <video className={styles.milestoneThumb} src={m.mediaUrl} muted loop autoPlay playsInline />
                ) : (
                  <img className={styles.milestoneThumb} src={m.mediaUrl} alt="" />
                )}
                <span>
                  <strong>{m.title}</strong> — {m.occurredOn}
                </span>
              </span>
              <button type="button" onClick={() => removeMilestone(m.id)}>
                Eliminar
              </button>
            </li>
          ))}
          {milestones.length === 0 && <li className={styles.hint}>Todavía no cargaste ningún hito.</li>}
        </ul>
        <MilestoneForm onAdd={addMilestone} saving={savingMilestone} />
      </section>
    </div>
  );
}

function BirthdayForm({
  birthDate,
  precision,
  onSave,
}: {
  birthDate: string;
  precision: string;
  onSave: (birthDate: string, precision: string) => void;
}) {
  const [localDate, setLocalDate] = useState(birthDate);
  const [localPrecision, setLocalPrecision] = useState(precision);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!localDate) return;
        onSave(localDate, localPrecision);
      }}
    >
      <input type="date" value={localDate} onChange={(e) => setLocalDate(e.target.value)} />
      <select
        className={styles.precisionSelect}
        value={localPrecision}
        onChange={(e) => setLocalPrecision(e.target.value)}
      >
        <option value="exact">Fecha exacta</option>
        <option value="month">Solo sé el mes</option>
        <option value="year">Solo sé el año</option>
      </select>
      <button type="submit" disabled={!localDate}>
        Guardar
      </button>
    </form>
  );
}

function BasicInfoForm({
  breed,
  sex,
  weightKg,
  showPublic,
  onSave,
}: {
  breed: string;
  sex: string;
  weightKg: string;
  showPublic: boolean;
  onSave: (breed: string, sex: string, weightKg: string, showPublic: boolean) => void;
}) {
  const [localBreed, setLocalBreed] = useState(breed);
  const [localSex, setLocalSex] = useState(sex);
  const [localWeight, setLocalWeight] = useState(weightKg);
  const [localShowPublic, setLocalShowPublic] = useState(showPublic);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(localBreed, localSex, localWeight, localShowPublic);
      }}
    >
      <input
        placeholder="Raza (ej: Golden retriever)"
        value={localBreed}
        onChange={(e) => setLocalBreed(e.target.value)}
        maxLength={60}
      />
      <select className={styles.precisionSelect} value={localSex} onChange={(e) => setLocalSex(e.target.value)}>
        <option value="">Sexo (no especificado)</option>
        <option value="male">Macho</option>
        <option value="female">Hembra</option>
      </select>
      <input
        type="number"
        placeholder="Peso (kg)"
        value={localWeight}
        onChange={(e) => setLocalWeight(e.target.value)}
        min={0}
        max={200}
        step="0.1"
      />
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={localShowPublic}
          onChange={(e) => setLocalShowPublic(e.target.checked)}
        />
        Mostrar estos datos (y la edad) en el perfil de emergencia
      </label>
      <button type="submit">Guardar</button>
    </form>
  );
}

function NotifyEmailForm({ email, onSave }: { email: string; onSave: (email: string) => void }) {
  const [localEmail, setLocalEmail] = useState(email);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(localEmail);
      }}
    >
      <input
        type="email"
        placeholder="tu@email.com"
        value={localEmail}
        onChange={(e) => setLocalEmail(e.target.value)}
      />
      <button type="submit">Guardar</button>
    </form>
  );
}

function VaccinationForm({ onAdd }: { onAdd: (name: string, appliedAt: string, nextDueAt: string) => void }) {
  const [name, setName] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [nextDueAt, setNextDueAt] = useState("");

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name || !appliedAt) return;
        onAdd(name, appliedAt, nextDueAt);
        setName("");
        setAppliedAt("");
        setNextDueAt("");
      }}
    >
      <input placeholder="Vacuna (ej: Rabia)" value={name} onChange={(e) => setName(e.target.value)} />
      <input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
      <input type="date" placeholder="Próxima dosis" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} />
      <button type="submit">Agregar</button>
    </form>
  );
}

function MilestoneForm({
  onAdd,
  saving,
}: {
  onAdd: (title: string, occurredOn: string, file: File) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title || !occurredOn || !file) return;
        onAdd(title, occurredOn, file);
        setTitle("");
        setOccurredOn("");
        setFile(null);
        (e.target as HTMLFormElement).reset();
      }}
    >
      <input placeholder="Título (ej: Llegó a casa)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
      <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button type="submit" disabled={saving || !title || !occurredOn || !file}>
        {saving ? "Guardando…" : "Agregar"}
      </button>
    </form>
  );
}
