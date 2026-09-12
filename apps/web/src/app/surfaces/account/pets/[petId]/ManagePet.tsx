"use client";

import { useState } from "react";
import Link from "next/link";
import type { PetHomeData, ResolvedMedia } from "@/lib/pets-data";
import type { VaccinationRow } from "@/lib/vaccinations-data";
import type { MilestoneRow } from "@/lib/milestones-data";
import { albumStyles } from "@/app/surfaces/pet/recuerdos/album-styles/registry";
import { PushOptIn } from "../../PushOptIn";
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
}: Props) {
  const [pet, setPet] = useState(initialPet);
  const [media, setMedia] = useState<ResolvedMedia[]>(initialPet.media);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>(initialVaccinations);
  const [milestones, setMilestones] = useState<MilestoneRow[]>(initialMilestones);
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

      {/* ── Avisos ── */}
      {!demoMode && (
        <section className={`${styles.section} glass`}>
          <h2 className={styles.sectionTitle}>Avisos</h2>
          <p className={styles.hint}>
            Activalo en este teléfono para enterarte al toque cuando alguien escanee la chapita de {pet.name} — con su
            ubicación aproximada, cuando la persona que la encontró decida compartirla.
          </p>
          <PushOptIn petId={petId} />
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

      {/* ── Contacto de emergencia ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Contacto de emergencia</h2>
        <p className={styles.hint}>
          Esto es lo que ve quien escanea la chapita física de {pet.name} — junto con la foto marcada como 🚨
          Emergencia arriba en &quot;Fotos y videos&quot; (siempre una foto, nunca un video, para que esa pantalla se
          vea siempre igual de rápido).
        </p>
        <EmergencyContactForm
          name={pet.emergencyContactName ?? ""}
          phone={pet.emergencyContactPhone ?? ""}
          onSave={(name, phone) => patchPet({ emergencyContactName: name || null, emergencyContactPhone: phone || null })}
          saving={saving}
        />
        <a href={emergencyHref} target="_blank" rel="noreferrer" className={styles.panelLink}>
          {emergencyIsReal ? `Ver el panel de emergencia de ${pet.name} →` : "Ver un ejemplo (todavía no vinculaste una chapita) →"}
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

function EmergencyContactForm({
  name,
  phone,
  onSave,
  saving,
}: {
  name: string;
  phone: string;
  onSave: (name: string, phone: string) => void;
  saving: boolean;
}) {
  const [localName, setLocalName] = useState(name);
  const [localPhone, setLocalPhone] = useState(phone);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(localName, localPhone);
      }}
    >
      <input placeholder="Nombre (ej: Facundo)" value={localName} onChange={(e) => setLocalName(e.target.value)} />
      <input placeholder="Teléfono (ej: +59899123456)" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} />
      <button type="submit" disabled={saving}>
        Guardar
      </button>
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
