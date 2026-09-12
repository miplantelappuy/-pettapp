// Máquina de estados de una chapita QR. Lógica pura (sin DB, sin fecha real
// inyectada salvo por parámetro) para poder testearla con `node` directo.
//
// Estados: unassigned -> active -> replaced
//                 \-------------> disabled
//          active -> disabled
//
// Una mascota puede pasar por varias chapitas en su vida; 'replaced' nunca se
// borra, así el historial completo queda reconstruible desde replacedByTagId.

export class QrTagError extends Error {}

/**
 * Activa una chapita sin asignar, asociándola a una mascota.
 * @param {{status: string}} tag
 * @param {string} petId
 * @param {Date} now
 */
export function activateTag(tag, petId, now = new Date()) {
  if (tag.status !== "unassigned") {
    throw new QrTagError(
      `No se puede activar una chapita en estado "${tag.status}" — solo se puede activar desde "unassigned".`,
    );
  }
  if (!petId) throw new QrTagError("Falta petId para activar la chapita.");

  return {
    status: "active",
    petId,
    activatedAt: now,
  };
}

/**
 * Reemplaza una chapita activa (perdida/dañada) por una nueva, sin que la
 * mascota pierda su perfil ni su historial.
 * @param {{status: string, petId: string|null}} oldTag
 * @param {{status: string}} newTag
 * @param {Date} now
 * @returns {{ oldTagPatch: object, newTagPatch: object }}
 */
export function replaceTag(oldTag, newTag, now = new Date()) {
  if (oldTag.status !== "active") {
    throw new QrTagError(
      `Solo se puede reemplazar una chapita "active" (estado actual: "${oldTag.status}").`,
    );
  }
  if (newTag.status !== "unassigned") {
    throw new QrTagError(
      `La chapita de reemplazo debe estar "unassigned" (estado actual: "${newTag.status}").`,
    );
  }
  if (!oldTag.petId) {
    throw new QrTagError("La chapita a reemplazar no tiene mascota asociada.");
  }

  return {
    oldTagPatch: { status: "replaced", replacedAt: now },
    newTagPatch: { status: "active", petId: oldTag.petId, activatedAt: now },
  };
}

/**
 * Deshabilita una chapita (robada, defectuosa, dada de baja del catálogo).
 * No se puede deshabilitar algo que ya está 'replaced' o 'disabled'.
 */
export function disableTag(tag) {
  if (tag.status === "replaced" || tag.status === "disabled") {
    throw new QrTagError(`La chapita ya está en estado terminal "${tag.status}".`);
  }
  return { status: "disabled" };
}

/**
 * Determina qué debe ver quien escanea la chapita, según su estado y el de
 * la mascota asociada. Pura — no accede a la DB, recibe los datos ya cargados.
 */
export function resolveScanView(tag, pet) {
  if (tag.status === "unassigned") return { view: "activation_pending" };
  if (tag.status === "disabled") return { view: "tag_disabled" };
  if (tag.status === "replaced") return { view: "tag_disabled" }; // el finder no debe usar una chapita vieja
  if (tag.status === "active") {
    if (!pet) throw new QrTagError("Chapita activa sin mascota asociada — estado inconsistente.");
    return pet.lostMode ? { view: "lost_mode", petSlug: pet.slug } : { view: "emergency_profile", petSlug: pet.slug };
  }
  throw new QrTagError(`Estado de chapita desconocido: "${tag.status}"`);
}
