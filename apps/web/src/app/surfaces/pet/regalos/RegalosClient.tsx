"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./regalos.module.css";

interface Gift {
  id: string;
  url: string;
  note: string | null;
}

// Los "sobres" empiezan cerrados: clickear uno lo da vuelta y muestra la
// foto de verdad, como abrir un sobre de figuritas. Desde ahí el dueño
// decide si la guarda en Recuerdos o la descarta.
export function RegalosClient({ petName, gifts, backHref }: { petName: string; gifts: Gift[]; backHref: string }) {
  const [items, setItems] = useState(gifts);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(id: string, action: "save" | "discard") {
    setBusyId(id);
    await fetch(`/api/gifts/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => {});
    setItems((list) => list.filter((g) => g.id !== id));
    setOpenedId(null);
    setBusyId(null);
  }

  return (
    <main className={styles.page}>
      <Link href={backHref} className={styles.back}>
        ← Volver
      </Link>
      <h1 className={styles.title}>Regalos para {petName}</h1>

      {items.length === 0 ? (
        <p className={styles.empty}>No tenés sobres nuevos por abrir. 🎁</p>
      ) : (
        <div className={styles.grid}>
          {items.map((gift) => {
            const isOpen = openedId === gift.id;
            return (
              <div key={gift.id} className={styles.flipOuter}>
                <div className={`${styles.flipInner} ${isOpen ? styles.flipInnerOpen : ""}`}>
                  <button
                    type="button"
                    className={`${styles.envelope} glass`}
                    onClick={() => setOpenedId(gift.id)}
                    aria-label="Abrir sobre"
                  >
                    <span className={styles.envelopeEmoji}>🎁</span>
                  </button>

                  <div className={`${styles.opened} glassStrong`}>
                    <img src={gift.url} alt="" className={styles.openedImg} />
                    {gift.note && <p className={styles.note}>“{gift.note}”</p>}
                    <div className={styles.openedActions}>
                      <button
                        type="button"
                        className="accentButton"
                        disabled={busyId === gift.id}
                        onClick={() => resolve(gift.id, "save")}
                      >
                        Guardar en Recuerdos
                      </button>
                      <button
                        type="button"
                        className="glassButton"
                        disabled={busyId === gift.id}
                        onClick={() => resolve(gift.id, "discard")}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
