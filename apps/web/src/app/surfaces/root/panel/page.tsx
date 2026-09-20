import { headers } from "next/headers";
import { SeedTagButton } from "./PanelClient";
import { requireAdminSession } from "@/lib/authz";
import styles from "./panel.module.css";

// Un solo link para Facundo: todo lo que está construido hasta ahora, con
// botones simples, sin tener que recordar ni escribir distintas URLs de
// vista previa. Guardá esta página en favoritos — es el punto de entrada
// mientras no haya una cuenta real ni dominio propio.
//
// Esta URL en sí sigue siendo pública (solo son vistas de ejemplo /
// preview-*, sin datos reales) — pero "Crear chapita de prueba" escribe en
// la base de verdad, así que ese botón en particular ahora pide sesión de
// operador (ver lib/authz.ts#requireAdminSession) en vez de estar abierto a
// cualquiera que encuentre este link.
export default async function PanelPage() {
  const admin = await requireAdminSession(await headers());
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Panel de control</h1>
      <p className={styles.lead}>
        Todo lo que está construido hasta ahora, en un solo lugar. Guardá este link en favoritos: no hace falta que
        entres por ningún otro.
      </p>

      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Vincular una mascota de verdad</h2>
        <p className={styles.sectionText}>
          Todavía no había ninguna chapita creada en la base de datos — por eso el mensaje &quot;Chapita no
          encontrada&quot;. Con este botón se crea una chapita real (como si fuera una física recién comprada) y te
          lleva directo a activarla con tu mascota.
        </p>
        {admin.ok ? (
          <SeedTagButton />
        ) : (
          <p className={styles.sectionText}>
            Iniciá sesión en <a href="/app">/app</a> con tu cuenta para poder crear chapitas de prueba desde acá.
          </p>
        )}
      </section>

      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Vistas armadas (con una mascota de ejemplo)</h2>
        <p className={styles.sectionText}>Así se ve cada pantalla ya construida, sin necesidad de tener una mascota real cargada.</p>
        <div className={styles.grid}>
          <a href="/preview-home" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>🏠 Panel del dueño</span>
            <span className={styles.tileText}>Home con foto/video, accesos y contacto de emergencia</span>
          </a>
          <a href="/preview-album" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>📸 Álbum — cinematográfico</span>
            <span className={styles.tileText}>Recuerdos, estilo moderno</span>
          </a>
          <a href="/preview-album?style=vintage-polaroid" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>📸 Álbum — polaroid vintage</span>
            <span className={styles.tileText}>Recuerdos, estilo vintage</span>
          </a>
          <a href="/preview-manage" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>⚙️ Gestionar mascota</span>
            <span className={styles.tileText}>Fotos, estilo, contacto, vacunas, hitos</span>
          </a>
          <a href="/preview-crecimiento" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>🐾 Crecimiento</span>
            <span className={styles.tileText}>El camino de vida, tipo mapa de niveles</span>
          </a>
          <a href="/preview-emergency" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>🚨 Perfil de emergencia</span>
            <span className={styles.tileText}>Lo que ve quien escanea la chapita</span>
          </a>
          <a href="/preview-regalos" className={`${styles.tile} glass`}>
            <span className={styles.tileTitle}>🎁 Regalos</span>
            <span className={styles.tileText}>Abrir las fotos que le dejaron a tu mascota</span>
          </a>
        </div>
      </section>

      <section className={`${styles.section} glass`}>
        <h2 className={styles.sectionTitle}>Cuenta con email/Google (en pausa)</h2>
        <p className={styles.sectionText}>
          Existe y funciona, pero por ahora el flujo principal no la necesita (se puede entrar solo con PIN). El
          envío de mail todavía no está configurado, así que si la probás avisame para pasarte el link de acceso a
          mano.
        </p>
        <div className={styles.actions}>
          <a href="/app" className="glassButton">
            Ir a /app
          </a>
        </div>
      </section>
    </main>
  );
}
