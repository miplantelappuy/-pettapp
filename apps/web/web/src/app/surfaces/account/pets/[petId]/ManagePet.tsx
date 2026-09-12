"use client";

import { useState } from "react";
import Link from "next/link";
import type { PetHomeData, ResolvedMedia } from "@/lib/pets-data";
import type { VaccinationRow } from "@/lib/vaccinations-data";
import { albumStyles } from "@/app/surfaces/pet/recuerdos/album-styles/registry";
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

interface Props {
  petId: string;
  initialPet: PetHomeData;
  initialVaccinations: VaccinationRow[];
  /** true en /preview-manage: todo pasa en memoria, nada se guarda de verdad
   * (no hay login ni mascota real todavía sin dominio propio). */
  demoMode?: boolean;
  /** Link de vuelta a "Tu familia" — ya viene con el prefijo correcto
   * (/app o "" según haya o no dominio propio) resuelto por quien llama. */
  accountHref?: string;
}

export function ManagePet({ petId, initialPet, initialVaccinations, demoMode = false, accountHref }: Props) {
  const [pet, setPet] = useState(initialPet);
  const [media, setMedia] = useState<ResolvedMedia[]>(initialPet.media);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>(initialVaccinations);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

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

  async function setHero(mediaId: string) {
    setMedia((list) => list.map((m) => ({ ...m, isProfileHero: m.id === mediaId })));
    if (demoMode) return flash("Portada actualizada (vista previa)");
    await fetch(`/api/pets/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isProfileHero: true }),
    });
    flash("Portada actualizada");
  }

  async function removePhoto(mediaId: string) {
    setMedia((list) => list.filter((m) => m.id !== mediaId));
    if (demoMode) return;
    await fetch(`/api/pets/media/${mediaId}`, { method: "DELETE" });
  }

  async function addPhotoFromFile(file: File) {
    if (demoMode) {
      const url = URL.createObjectURL(file);
      setMedia((list) => [
        ...list,
        {
          id: `local-${Date.now()}`,
          type: "photo",
          url,
          caption: null,
          width: null,
          height: null,
          isProfileHero: list.length === 0,
          orderIndex: list.length,
        },
      ]);
      return;
    }

    const res = await fetch("/api/media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, contentType: file.type, kind: "photo" }),
    });
    if (!res.ok) return flash("No se pudo subir la foto");
    const { uploadUrl, mediaId, readUrl } = await res.json();
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    setMedia((list) => [
      ...list,
      {
        id: mediaId,
        type: "photo",
        url: readUrl,
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

      {/* ── Fotos ── */}
      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Fotos</h2>
        <div className={styles.photoGrid}>
          {media.map((m) => (
            <div key={m.id} className={styles.photoCard}>
              <img src={m.url} alt="" />
              {m.isProfileHero && <span className={styles.heroTag}>Portada</span>}
              <div className={styles.photoActions}>
                {!m.isProfileHero && (
                  <button type="button" onClick={() => setHero(m.id)}>
                    ★ Portada
                  </button>
                )}
                <button type="button" onClick={() => removePhoto(m.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <label className={styles.addPhoto}>
            + Agregar foto
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addPhotoFromFile(file);
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
        <p className={styles.hint}>Esto es lo que ve quien escanea la chapita física de {pet.name}.</p>
        <EmergencyContactForm
          name={pet.emergencyContactName ?? ""}
          phone={pet.emergencyContactPhone ?? ""}
          onSave={(name, phone) => patchPet({ emergencyContactName: name || null, emergencyContactPhone: phone || null })}
          saving={saving}
        />
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
