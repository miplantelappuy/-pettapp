import assert from "node:assert/strict";
import { resolveHost, resolveTempPathSurface } from "./host.js";

const BASE = "tuapp.com";

// Superficies válidas
assert.deepEqual(resolveHost("tuapp.com", BASE), { surface: "root" });
assert.deepEqual(resolveHost("app.tuapp.com", BASE), { surface: "account" });
assert.deepEqual(resolveHost("tag.tuapp.com", BASE), { surface: "emergency" });
assert.deepEqual(resolveHost("milo.tuapp.com", BASE), { surface: "pet", slug: "milo" });
assert.deepEqual(resolveHost("lola.tuapp.com", BASE), { surface: "pet", slug: "lola" });

// Case-insensitive y trailing dot
assert.deepEqual(resolveHost("MILO.TUAPP.COM", BASE), { surface: "pet", slug: "milo" });
assert.deepEqual(resolveHost("milo.tuapp.com.", BASE), { surface: "pet", slug: "milo" });

// BASE_DOMAIN con puerto (desarrollo local)
assert.deepEqual(resolveHost("milo.localhost:3000", "localhost:3000"), { surface: "pet", slug: "milo" });
assert.deepEqual(resolveHost("app.localhost:3000", "localhost:3000"), { surface: "account" });

// Inválidos: otro dominio, subdominio anidado, slug con formato inválido, 'www'
assert.equal(resolveHost("evil.com", BASE), null);
assert.equal(resolveHost("milo.evil.com", BASE), null);
assert.equal(resolveHost("milo.otro.tuapp.com", BASE), null); // anidado, no soportado
assert.equal(resolveHost("www.tuapp.com", BASE), null);
assert.equal(resolveHost("-milo.tuapp.com", BASE), null); // no puede empezar con guion
assert.equal(resolveHost("", BASE), null);
assert.equal(resolveHost("milo.tuapp.com", ""), null);

// Alias de rutas temporal (sin dominio propio)
assert.deepEqual(resolveTempPathSurface("/app"), { surface: "account", rest: "/" });
assert.deepEqual(resolveTempPathSurface("/app/pets/xyz"), { surface: "account", rest: "/pets/xyz" });
assert.deepEqual(resolveTempPathSurface("/tag/abc123"), { surface: "emergency", rest: "/t/abc123" });
assert.deepEqual(resolveTempPathSurface("/p/milo"), { surface: "pet", slug: "milo", rest: "/" });
assert.deepEqual(resolveTempPathSurface("/p/milo/recuerdos"), { surface: "pet", slug: "milo", rest: "/recuerdos" });
assert.equal(resolveTempPathSurface("/preview-home"), null); // no debe pisar las rutas de preview existentes
assert.equal(resolveTempPathSurface("/p/-milo"), null); // slug con formato inválido
assert.equal(resolveTempPathSurface("/apps/otracosa"), null); // no debe matchear por prefijo parcial ("/apps" != "/app")

console.log("host.test.mjs: todos los casos pasaron (%d asserts)", 23);
