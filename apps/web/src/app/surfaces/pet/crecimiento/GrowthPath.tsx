"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { MilestoneRow } from "@/lib/milestones-data";
import styles from "./GrowthPath.module.css";

interface PathNode {
  key: string;
  title: string;
  date: string;
  photoUrl: string | null;
  kind: "birth" | "milestone" | "today";
}

interface Props {
  petName: string;
  species: string;
  birthDate: string | null;
  milestones: MilestoneRow[];
  /** Si se pasa, muestra el link "← Volver" arriba (uso en /crecimiento como
   * página propia). Si se omite, no lo muestra (uso embebido en el Home). */
  backHref?: string;
  /** A Gestionar, para cargar el primer hito desde el estado vacío. */
  manageHref: string;
}

const PAWS_PER_SEGMENT = 6;

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
// automático en el nacimiento y un final fijo en "Hoy"), y huellas entre
// medio que se van revelando a medida que se scrollea — como si fueran los
// pasos que dio la mascota para llegar hasta ahí. Un solo cálculo de
// "progreso de scroll" maneja tanto las huellas como la aparición de cada
// burbuja: es EL momento de animación de esta pantalla (ver guía de diseño:
// mejor un efecto orquestado que muchos sueltos).
export function GrowthPath({ petName, species, birthDate, milestones, backHref, manageHref }: Props) {
  const nodes = useMemo<PathNode[]>(() => {
    const list: PathNode[] = [];
    if (birthDate) {
      list.push({ key: "birth", title: `Nacimiento de ${petName}`, date: birthDate, photoUrl: null, kind: "birth" });
    }
    for (const m of milestones) {
      list.push({ key: m.id, title: m.title, date: m.occurredOn, photoUrl: m.photoUrl, kind: "milestone" });
    }
    list.push({
      key: "today",
      title: "Hoy",
      date: new Date().toISOString().slice(0, 10),
      photoUrl: null,
      kind: "today",
    });
    return list;
  }, [petName, birthDate, milestones]);

  // Coordenadas en un espacio de 100 (ancho) x cantidad-de-nodos (alto) —
  // cada nodo ocupa exactamente una "fila" y el zigzag 22/78 queda igual
  // sin importar cuántos hitos haya.
  const points = useMemo(() => nodes.map((_, i) => ({ x: i % 2 === 0 ? 22 : 78, y: i + 0.5 })), [nodes]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // Huellas repartidas a lo largo de cada tramo (misma curva que el trazo
  // guía), con el ángulo del tramo para que queden "mirando" hacia dónde
  // avanza el camino en vez de todas paradas derecho.
  const paws = useMemo(() => {
    const list: { key: string; x: number; y: number; angleDeg: number; yFraction: number; side: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      const c1 = { x: prev.x, y: midY };
      const c2 = { x: curr.x, y: midY };
      // Ángulo aproximado del tramo (una sola vez por tramo, no punto a
      // punto): alcanza para que las huellas se sientan orientadas sin
      // tener que medir el contenedor en píxeles.
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

  return (
    <section className={styles.page}>
      {backHref && (
        <Link href={backHref} className={styles.backLink}>
          ← Volver
        </Link>
      )}
      <h2 className={styles.title}>El camino de {petName}</h2>
      <p className={styles.lead}>Las huellas que dejó desde que llegó a la familia hasta hoy.</p>

      {milestones.length === 0 ? (
        <div className={`${styles.empty} glass`}>
          <p>Todavía no cargaste hitos para este camino.</p>
          <Link href={manageHref} className={styles.emptyLink}>
            Agregar el primero desde Gestionar →
          </Link>
        </div>
      ) : (
        <div ref={containerRef} className={styles.path} style={{ height: `${nodes.length * 16}rem` }}>
          <svg className={styles.pathSvg} viewBox={`0 0 100 ${nodes.length}`} preserveAspectRatio="none" aria-hidden>
            <path d={pathD} className={styles.pathTrack} />
          </svg>

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
            return (
              <div
                key={node.key}
                className={`${styles.node} ${revealed ? styles.nodeVisible : ""} ${styles[`kind_${node.kind}`]}`}
                style={{ left: `${points[i].x}%`, top: `${(points[i].y / nodes.length) * 100}%` }}
              >
                <div className={styles.bubble}>
                  {node.photoUrl ? (
                    <img src={node.photoUrl} alt="" />
                  ) : (
                    <span className={styles.bubbleIcon}>{node.kind === "today" ? "🏁" : "🐾"}</span>
                  )}
                </div>
                <span className={styles.nodeTitle}>{node.title}</span>
                <span className={styles.nodeDate}>{formatDate(node.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
