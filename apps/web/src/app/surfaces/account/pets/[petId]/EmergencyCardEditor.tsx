"use client";

import { useState } from "react";
import type { EmergencyFieldRow } from "@/lib/emergency-fields-data";
// OJO: se importa desde ./allergy (no desde emergency-fields-data), a
// propósito — ese otro archivo también importa el cliente de Postgres, y
// como este es un componente "use client", arrastrarlo rompe el build (ver
// el comentario en lib/allergy.ts).
import { isAllergyLabel } from "@/lib/allergy";
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
  onAddField: () => void;
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

  const allergyFields = fields.filter((f) => isAllergyLabel(f.label));
  const otherFields = fields.filter((f) => !isAllergyLabel(f.label));

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

          {allergyFields.map((f) => (
            <div key={f.id} className={cardStyles.allergyAlert}>
              <span className={cardStyles.allergyIcon} aria-hidden>
                ⚠️
              </span>
              <div className={styles.allergyEdit}>
                <input
                  className={styles.allergyLabelInput}
                  value={f.label}
                  onChange={(e) => onUpdateField(f.id, { label: e.target.value })}
                  placeholder="Alergia"
                  aria-label="Nombre del dato de alergia"
                  maxLength={60}
                />
                <input
                  className={styles.allergyValueInput}
                  value={f.value}
                  onChange={(e) => onUpdateField(f.id, { value: e.target.value })}
                  placeholder="Ej: penicilina"
                  aria-label="Detalle de la alergia"
                  maxLength={300}
                />
              </div>
              <button
                type="button"
                className={styles.removeField}
                onClick={() => onRemoveField(f.id)}
                aria-label="Eliminar esta alergia"
              >
                ✕
              </button>
            </div>
          ))}

          {otherFields.length > 0 && (
            <div className={cardStyles.fieldsList}>
              {otherFields.map((f) => (
                <div key={f.id} className={`${cardStyles.fieldRow} ${styles.fieldRowEdit}`}>
                  <input
                    className={styles.fieldLabelInput}
                    value={f.label}
                    onChange={(e) => onUpdateField(f.id, { label: e.target.value })}
                    placeholder="Dato (ej: Dirección)"
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
            <button type="button" className={styles.addFieldButton} onClick={onAddField}>
              + Agregar dato (alergias, dirección, lo que sea)
            </button>
          )}

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
      </div>

      <button type="button" className={`accentButton ${styles.saveButton}`} onClick={() => onSave(localName, localPhone)} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </div>
  );
}
