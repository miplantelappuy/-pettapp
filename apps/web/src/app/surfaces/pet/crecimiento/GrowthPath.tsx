"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import type { MilestoneRow } from "@/lib/milestones-data";
import styles from "./GrowthPath.module.css";

interface PathNode {
  key: string;
  title: string;
  date: string;
  mediaUrl: string | null;
  mediaType: "photo" | "video";
  kind: "birth" | "milestone" | "empty" | "today";
  /** Solo en kind "milestone": el id real, para poder borrarlo. */
  milestoneId?: string;
}

interface Props {
  petName: string;
  species: string;
  birthDate: string | null;
  milestones: MilestoneRow[];
  /** Si se pasa, muestra el link "← Volver" arriba (uso en /crecimiento como
   * página propia). Si se omite, no lo muestra (uso embebido en el Home). */
  backHref?: string;
  /** A Gestionar, para el link del estado vacío. */
  manageHref: string;
  /** Necesario para poder agregar/borrar hitos tocando el camino directamente
   * (no solo desde Gestionar). */
  petId: string;
  /** true en las vistas previas (/preview-home, /preview-crecimiento): todo
   * pasa en memoria, nada se guarda de verdad. */
  demoMode?: boolean;
}

const PAWS_PER_SEGMENT = 6;
// Qué tan "ancho" es el efecto de agrandado al llegar a un nodo, en
// fracción de progreso total del camino (0 a 1) — más chico = el agrandado
// dura menos scroll.
const BUMP_WINDOW = 0.05;
// Cuántas burbujas vacías ("tocá para sumar un recuerdo") se muestran
// siempre después del último hito real — así el camino se ve "prearmado"
// como un mapa de niveles, en vez de terminar de golpe apenas se cargó algo.
const EMPTY_SLOTS = 3;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
}

interface PawSvgProps {
  className?: string;
  style?: CSSProperties;
}

// Huella de perro: un pad grande y ovalado + 4 dedos redondeados y juntos.
function DogPaw({ className, style }: PawSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <ellipse cx="12" cy="17.5" rx="6.5" ry="5.3" />
      <ellipse cx="5.2" cy="8" rx="2.7" ry="3.6" />
      <ellipse cx="10.4" cy="4.8" rx="2.6" ry="3.7" />
      <ellipse cx="15.6" cy="4.8" rx="2.6" ry="3.7" />
      <ellipse cx="20.8" cy="8" rx="2.7" ry="3.6" />
    </svg>
  );
}

// Huella de gato: pad inferior de tres lóbulos (festoneado) + dedos más
// chicos y separados — distinta silueta a la del perro a propósito.
function CatPaw({ className, style }: PawSvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M12 20.2c-4.1 0-6.7-2.2-6.7-5.1 0-2.3 2.1-3.6 6.7-3.6s6.7 1.3 6.7 3.6c0 2.9-2.6 5.1-6.7 5.1z" />
      <ellipse cx="6.3" cy="7.5" rx="2.3" ry="3" />
      <ellipse cx="10.7" cy="4.7" rx="2.2" ry="3.1" />
      <ellipse cx="15.3" cy="4.7" rx="2.2" ry="3.1" />
      <ellipse cx="19.7" cy="7.5" rx="2.3" ry="3" />
    </svg>
  );
}

function PawIcon({ species, className, style }: { species: string } & PawSvgProps) {
  return species === "cat" ? <CatPaw className={className} style={style} /> : <DogPaw className={className} style={style} />;
}

function cubicPoint(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

// El "mapa de niveles" tipo Candy Crush: un camino que serpentea de
// izquierda a derecha, con una burbuja por cada hito de vida (más un inicio
// automático en el nacimiento, unas paradas vacías que invitan a seguir
// cargando, y un final fijo en "Hoy"), y huellas entre medio que se van
// revelando a medida que se scrollea. Las burbujas son interactivas: tocar
// una vacía abre el formulario para cargarle una foto o video ahí mismo;
// tocar una ya cargada la muestra en grande.
export function GrowthPath({ petName, species, birthDate, milestones: initialMilestones, backHref, manageHref, petId, demoMode = false }: Props) {
  const [milestones, setMilestones] = useState<MilestoneRow[]>(initialMilestones);
  const [saving, setSaving] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addMilestone(title: string, occurredOn: string, file: File) {
    const mediaType: "photo" | "video" = file.type.startsWith("video/") ? "video" : "photo";

    if (demoMode) {
      const mediaUrl = URL.createObjectURL(file);
      setMilestones((list) =>
        [...list, { id: `local-${Date.now()}`, title, occurredOn, mediaUrl, mediaType }].sort((a, b) =>
          a.occurredOn.localeCompare(b.occurredOn),
        ),
      );
      setUploadOpen(false);
      return;
    }

    if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
      setError("El video pesa demasiado (máx. 300MB). Probá con un clip más corto.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("occurredOn", occurredOn);
      form.append("file", file);
      const res = await fetch(`/api/pets/${petId}/milestones`, { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "No se pudo guardar el hito");
        return;
      }
      setMilestones((list) =>
        [
          ...list,
          { id: body.id, title: body.title, occurredOn: body.occurredOn, mediaUrl: body.mediaUrl, mediaType: body.mediaType },
        ].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)),
      );
      setUploadOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeMilestone(id: string) {
    setMilestones((list) => list.filter((m) => m.id !== id));
    setLightboxKey(null);
    if (demoMode || id.startsWith("local-")) return;
    await fetch(`/api/pets/milestones/${id}`, { method: "DELETE" });
  }

  const nodes = useMemo<PathNode[]>(() => {
    const list: PathNode[] = [];
    if (birthDate) {
      list.push({ key: "birth", title: `Nacimiento de ${petName}`, date: birthDate, mediaUrl: null, mediaType: "photo", kind: "birth" });
    }
    for (const m of milestones) {
      list.push({ key: m.id, title: m.title, date: m.occurredOn, mediaUrl: m.mediaUrl, mediaType: m.mediaType, kind: "milestone", milestoneId: m.id });
    }
    for (let i = 0; i < EMPTY_SLOTS; i++) {
      list.push({ key: `empty-${i}`, title: "Agregar recuerdo", date: "", mediaUrl: null, mediaType: "photo", kind: "empty" });
    }
    list.push({
      key: "today",
      title: "Hoy",
      date: new Date().toISOString().slice(0, 10),
      mediaUrl: null,
      mediaType: "photo",
      kind: "today",
    });
    return list;
  }, [petName, birthDate, milestones]);

  // Coordenadas en un espacio de 100 (ancho) x cantidad-de-nodos (alto) —
  // cada nodo ocupa exactamente una "fila" y el zigzag 22/78 queda igual
  // sin importar cuántos hitos haya.
  const points = useMemo(() => nodes.map((_, i) => ({ x: i % 2 === 0 ? 22 : 78, y: i + 0.5 })), [nodes]);

  // Huellas repartidas a lo largo de una curva suave entre cada par de
  // nodos (sin dibujar ninguna línea de fondo — son las huellas mismas las
  // que muestran el camino), con el ángulo del tramo para que queden
  // "mirando" hacia dónde avanza en vez de todas paradas derecho.
  const paws = useMemo(() => {
    const list: { key: string; x: number; y: number; angleDeg: number; yFraction: number; side: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      const c1 = { x: prev.x, y: midY };
      const c2 = { x: curr.x, y: midY };
      const angleDeg = (Math.atan2(curr.y - prev.y, curr.x - prev.x) * 180) / Math.PI;
      for (let k = 1; k <= PAWS_PER_SEGMENT; k++) {
        const t = k / (PAWS_PER_SEGMENT + 1);
        const pt = cubicPoint(prev, c1, c2, curr, t);
        list.push({
          key: `${i}-${k}`,
          x: pt.x,
          y: pt.y,
          angleDeg,
          yFraction: pt.y / nodes.length,
          side: k % 2 === 0 ? 1 : -1,
        });
      }
    }
    return list;
  }, [points, nodes.length]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setProgress(1);
      return;
    }

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const viewportAnchor = window.innerHeight * 0.75;
        const p = (viewportAnchor - rect.top) / rect.height;
        setProgress(Math.min(1, Math.max(0, p)));
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Esc cierra lo que esté abierto (modal de carga o visor grande).
  useEffect(() => {
    if (!uploadOpen && !lightboxKey) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setUploadOpen(false);
        setLightboxKey(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [uploadOpen, lightboxKey]);

  const lightboxNode = nodes.find((n) => n.key === lightboxKey) ?? null;

  return (
    <section className={styles.page}>
      {backHref && (
        <Link href={backHref} className={styles.backLink}>
          ← Volver
        </Link>
      )}
      <h2 className={styles.title}>El camino de {petName}</h2>
      <p className={styles.lead}>
        Las huellas que dejó desde que llegó a la familia hasta hoy. Tocá una burbuja vacía para sumar un recuerdo, o
        una ya cargada para verla en grande.
      </p>

      <div ref={containerRef} className={styles.path} style={{ height: `${nodes.length * 16}rem` }}>
        {paws.map((paw) => {
          const revealed = progress >= paw.yFraction - 0.015;
          const style = {
            left: `calc(${paw.x}% + ${paw.side * 1.6}%)`,
            top: `${(paw.y / nodes.length) * 100}%`,
            ["--paw-angle" as string]: `${paw.angleDeg + 90}deg`,
          } as CSSProperties;
          return (
            <PawIcon
              key={paw.key}
              species={species}
              className={`${styles.paw} ${revealed ? styles.pawVisible : ""}`}
              style={style}
            />
          );
        })}

        {nodes.map((node, i) => {
          const yFraction = (i + 0.5) / nodes.length;
          const revealed = progress >= yFraction - 0.04;
          // Cuando el scroll "llega" a este punto del camino, la burbuja
          // se agranda un poco y vuelve a su tamaño normal al seguir
          // scrolleando — cuanto más cerca está el progreso de este nodo,
          // más grande, con una caída suave a los costados en vez de un
          // salto brusco.
          const distanceToNode = Math.abs(progress - yFraction);
          const arrivalBump = Math.max(0, 1 - distanceToNode / BUMP_WINDOW);
          const scale = revealed ? 1 + arrivalBump * 0.35 : 0.7;
          const tappable = node.kind === "empty" || node.kind === "milestone";
          return (
            <div
              key={node.key}
              className={`${styles.node} ${revealed ? styles.nodeVisible : ""} ${styles[`kind_${node.kind}`]}`}
              style={{
                left: `${points[i].x}%`,
                top: `${(points[i].y / nodes.length) * 100}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              <button
                type="button"
                className={styles.bubble}
                disabled={!tappable}
                aria-label={node.kind === "empty" ? "Agregar un recuerdo acá" : node.title}
                onClick={() => {
                  if (node.kind === "empty") {
                    setError(null);
                    setUploadOpen(true);
                  } else if (node.kind === "milestone") {
                    setLightboxKey(node.key);
                  }
                }}
              >
                {node.kind === "empty" ? (
                  <span className={styles.bubbleAdd}>+</span>
                ) : node.mediaUrl ? (
                  node.mediaType === "video" ? (
                    <video src={node.mediaUrl} muted loop autoPlay playsInline />
                  ) : (
                    <img src={node.mediaUrl} alt="" />
                  )
                ) : (
                  <span className={styles.bubbleIcon}>{node.kind === "today" ? "🏁" : "🐾"}</span>
                )}
              </button>
              <span className={styles.nodeTitle}>{node.title}</span>
              {node.kind !== "empty" && <span className={styles.nodeDate}>{formatDate(node.date)}</span>}
            </div>
          );
        })}
      </div>

      {milestones.length === 0 && (
        <p className={styles.emptyHint}>
          También podés cargarlos todos juntos desde{" "}
          <Link href={manageHref} className={styles.emptyLink}>
            Gestionar
          </Link>
          .
        </p>
      )}

      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onAdd={addMilestone} saving={saving} error={error} />
      )}

      {lightboxNode && (
        <Lightbox
          node={lightboxNode}
          onClose={() => setLightboxKey(null)}
          onDelete={lightboxNode.milestoneId ? () => removeMilestone(lightboxNode.milestoneId as string) : undefined}
        />
      )}
    </section>
  );
}

function UploadModal({
  onClose,
  onAdd,
  saving,
  error,
}: {
  onClose: () => void;
  onAdd: (title: string, occurredOn: string, file: File) => void;
  saving: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title || !occurredOn || !file) return;
    onAdd(title, occurredOn, file);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} glassStrong`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <h3 className={styles.modalTitle}>Sumar un recuerdo</h3>
        <p className={styles.modalHint}>Una foto o video, con su fecha y un título corto.</p>
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <input placeholder="Título (ej: Llegó a casa)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
          <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {error && <p className={styles.modalError}>{error}</p>}
          <button type="submit" disabled={saving || !title || !occurredOn || !file}>
            {saving ? "Guardando…" : "Agregar al camino"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Lightbox({ node, onClose, onDelete }: { node: PathNode; onClose: () => void; onDelete?: () => void }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.lightbox} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        {node.mediaUrl && node.mediaType === "video" ? (
          <video src={node.mediaUrl} className={styles.lightboxMedia} controls autoPlay muted playsInline />
        ) : node.mediaUrl ? (
          <img src={node.mediaUrl} alt="" className={styles.lightboxMedia} />
        ) : null}
        <div className={styles.lightboxCaption}>
          <span className={styles.lightboxTitle}>{node.title}</span>
          <span className={styles.lightboxDate}>{formatDate(node.date)}</span>
        </div>
        {onDelete && (
          <button type="button" className={styles.lightboxDelete} onClick={onDelete}>
            Eliminar este hito
          </button>
        )}
      </div>
    </div>
  );
}
