import assert from "node:assert/strict";
import { activateTag, replaceTag, disableTag, resolveScanView, QrTagError } from "./qr.js";

const NOW = new Date("2026-09-11T12:00:00Z");

// Activación válida
{
  const tag = { status: "unassigned" };
  const patch = activateTag(tag, "pet_milo", NOW);
  assert.deepEqual(patch, { status: "active", petId: "pet_milo", activatedAt: NOW });
}

// No se puede activar una chapita ya activa
{
  assert.throws(() => activateTag({ status: "active" }, "pet_milo"), QrTagError);
}

// No se puede activar sin petId
{
  assert.throws(() => activateTag({ status: "unassigned" }, undefined), QrTagError);
}

// Reemplazo válido: la mascota conserva su petId, la vieja queda 'replaced'
{
  const oldTag = { status: "active", petId: "pet_milo" };
  const newTag = { status: "unassigned" };
  const { oldTagPatch, newTagPatch } = replaceTag(oldTag, newTag, NOW);
  assert.deepEqual(oldTagPatch, { status: "replaced", replacedAt: NOW });
  assert.deepEqual(newTagPatch, { status: "active", petId: "pet_milo", activatedAt: NOW });
}

// No se puede reemplazar una chapita que no está activa
{
  assert.throws(() => replaceTag({ status: "unassigned", petId: null }, { status: "unassigned" }), QrTagError);
}

// No se puede usar como reemplazo una chapita que no está 'unassigned'
{
  assert.throws(
    () => replaceTag({ status: "active", petId: "pet_milo" }, { status: "active" }),
    QrTagError,
  );
}

// disableTag: válido desde unassigned y active, inválido desde replaced/disabled
{
  assert.deepEqual(disableTag({ status: "unassigned" }), { status: "disabled" });
  assert.deepEqual(disableTag({ status: "active" }), { status: "disabled" });
  assert.throws(() => disableTag({ status: "replaced" }), QrTagError);
  assert.throws(() => disableTag({ status: "disabled" }), QrTagError);
}

// resolveScanView: los 4 casos relevantes
{
  assert.deepEqual(resolveScanView({ status: "unassigned" }, null), { view: "activation_pending" });
  assert.deepEqual(resolveScanView({ status: "disabled" }, null), { view: "tag_disabled" });
  assert.deepEqual(resolveScanView({ status: "replaced" }, null), { view: "tag_disabled" });
  assert.deepEqual(
    resolveScanView({ status: "active" }, { lostMode: false, slug: "milo" }),
    { view: "emergency_profile", petSlug: "milo" },
  );
  assert.deepEqual(
    resolveScanView({ status: "active" }, { lostMode: true, slug: "milo" }),
    { view: "lost_mode", petSlug: "milo" },
  );
  // chapita activa sin mascota asociada es un estado inconsistente -> debe explotar, no fallar en silencio
  assert.throws(() => resolveScanView({ status: "active" }, null), QrTagError);
}

console.log("qr.test.mjs: todos los casos pasaron");
