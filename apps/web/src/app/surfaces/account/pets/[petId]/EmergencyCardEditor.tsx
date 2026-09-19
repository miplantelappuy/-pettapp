"use client";

import { useState } from "react";
import type { EmergencyFieldRow } from "@/lib/emergency-fields-data";
// OJO: importa el CSS module de la pantalla PÚBLICA de verdad (no una copia
// aparte) — así el dueño ve literalmente el mismo diseño que ve quien
// escanea la chapita, en vez de una maqueta chica que puede desactualizarse
// sola con el tiempo. Lo único que cambia acá es que el texto es editable.
import cardStyles from "../../../emergency/t/[token]/emergency.module.css";
import styles from "./EmergencyCardEditor.module.css";

interface Props {
  petName: string;
  photoUrl: string | null;
  contactName: string;
  contactPhone: string;
  fields: EmergencyFieldRow[];
  saving: boolean;
  onAddField: (kind: "medical_alert" | "custom") => void;
  onUpdateField: (id: string, patch: Partial<Pick<EmergencyFieldRow, "label" | "value">>) => void;
  onRemoveField: (id: string) => void;
  onSave: (name: string, phone: string) => void;
}

const MAX_FIELDS = 12;

export function EmergencyCardEditor({
  petName,
  photoUrl,
  contactName,
  contactPhone,
  fields,
  saving,
  onAddField,
  onUpdateField,
  onRemoveField,
  onSave,
}: Props) {
  const [localName, setLocalName] = useState(contactName);
  const [localPhone, setLocalPhone] = useState(contactPhone);

  // "medical_alert" es un tipo de dato aparte, no algo que se adivina del
  // texto que el dueño escribió — como mucho hay uno, y siempre va primero.
  const medicalAlert = fields.find((f) => f.kind === "medical_alert") ?? null;
  const customFields = fields.filter((f) => f.kind !== "medical_alert");

  return (
    <div>
      <div className={styles.wrap}>
        <div className={cardStyles.heroWrap}>
          {photoUrl ? (
            <img src={photoUrl} alt="" className={cardStyles.photo} />
          ) : (
            <div className={cardStyles.photoPlaceholder} aria-hidden />
          )}
          <div className={cardStyles.heroScrim} />
        </div>

        <div className={`${cardStyles.card} glassStrong`}>
          <p className={cardStyles.name}>Hola 🐾 Soy {petName || "tu mascota"}</p>
          <p className={cardStyles.subtitle}>Creo que estoy perdido/a. ¿Me ayudás a volver a casa?</p>

          {/* ── Contacto: aparte, no es "un dato más" ── */}
          <div className={styles.contactSection}>
            <p className={styles.contactHeading}>📞 Contacto de emergencia</p>
            <div className={styles.contactEdit}>
              <input
                className={styles.contactInput}
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Nombre de contacto"
                aria-label="Nombre de contacto de emergencia"
                maxLength={80}
              />
              <input
                className={styles.contactInput}
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="Teléfono (ej: +59899123456)"
                aria-label="Teléfono de contacto de emergencia"
                maxLength={40}
              />
            </div>
            {/* No son botones de verdad acá (no hay a quién llamar desde tu
                propio panel) — son solo para que veas cómo van a quedar. */}
            <div className={cardStyles.actionRow} aria-hidden>
              <span className="accentButton" style={{ pointerEvents: "none" }}>
                📞 Llamar
              </span>
              <span className="glassButton" style={{ pointerEvents: "none" }}>
                💬 WhatsApp
              </span>
            </div>
          </div>

          {/* ── Alerta médica: un dato fijo y propio, siempre primero ── */}
          {medicalAlert ? (
            <div className={cardStyles.allergyAlert}>
              <span className={cardStyles.allergyIcon} aria-hidden>
                ⚠️
              </span>
              <div className={styles.medicalAlertEdit}>
                <strong className={styles.medicalAlertLabel}>Alerta médica</strong>
                <textarea
                  className={styles.medicalAlertValueInput}
                  value={medicalAlert.value}
                  onChange={(e) => onUpdateField(medicalAlert.id, { value: e.target.value })}
                  placeholder="Ej: alérgico a la penicilina, toma medicación para el corazón, no darle huesos."
                  aria-label="Detalle de la alerta médica"
                  maxLength={500}
                  rows={2}
                />
              </div>
              <button
                type="button"
                className={styles.removeField}
                onClick={() => onRemoveField(medicalAlert.id)}
                aria-label="Eliminar la alerta médica"
              >
                ✕
              </button>
            </div>
          ) : (
            <button type="button" className={styles.addMedicalAlertButton} onClick={() => onAddField("medical_alert")}>
              ⚠️ Agregar Alerta médica
            </button>
          )}

          {/* ── Otros datos libres: comportamiento, dirección, lo que sea ── */}
          {customFields.length > 0 && (
            <div className={cardStyles.fieldsList}>
              {customFields.map((f) => (
                <div key={f.id} className={`${cardStyles.fieldRow} ${styles.fieldRowEdit}`}>
                  <input
                    className={styles.fieldLabelInput}
                    value={f.label}
                    onChange={(e) => onUpdateField(f.id, { label: e.target.value })}
                    placeholder="Dato (ej: Comportamiento)"
                    aria-label="Nombre del dato"
                    maxLength={60}
                  />
                  <input
                    className={styles.fieldValueInput}
                    value={f.value}
                    onChange={(e) => onUpdateField(f.id, { value: e.target.value })}
                    placeholder="Detalle"
                    aria-label="Detalle del dato"
                    maxLength={300}
                  />
                  <button
                    type="button"
                    className={styles.removeField}
                    onClick={() => onRemoveField(f.id)}
                    aria-label="Eliminar este dato"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {fields.length < MAX_FIELDS && (
            <button type="button" className={styles.addFieldButton} onClick={() => onAddField("custom")}>
              + Agregar otro dato (comportamiento, dirección, lo que sea)
            </button>
          )}
        </div>
      </div>

      <button type="button" className={`accentButton ${styles.saveButton}`} onClick={() => onSave(localName, localPhone)} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
