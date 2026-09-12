"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  birthDate: string | null;
  milestones: MilestoneRow[];
  /** Volver al Home de la mascota. */
  backHref: string;
  /** A Gestionar, para cargar el primer hito desde el estado vacío. */
  manageHref: string;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
}

// El "mapa de niveles" tipo Candy Crush: un camino que serpentea de
// izquierda a derecha, con un punto por cada hito de vida (más un inicio
// automático en el nacimiento y un final fijo en "Hoy"), que se va
// revelando a medida que se scrollea en vez de mostrarse todo de una. Un
// solo listener de scroll maneja tanto el avance de la línea como la
// aparición de cada burbuja — es EL momento de animación de esta pantalla
// (ver guía de diseño: mejor un efecto orquestado que muchos sueltos).
export function GrowthPath({ petName, birthDate, milestones, backHref, manageHref }: Props) {
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

  // Coordenadas en un viewBox de 100 (ancho) x cantidad-de-nodos (alto) —
  // así cada nodo ocupa exactamente una "fila" y el zigzag 22/78 queda
  // igual sin importar cuántos hitos haya.
  const points = useMemo(() => nodes.map((_, i) => ({ x: i % 2 === 0 ? 22 : 78, y: i + 0.5 })), [nodes]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      // Curva suave punto a punto: sube/baja a mitad de camino en vez de un
      // quiebre recto, para que se sienta más "sendero" que "gráfico".
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  const containerRef = useRef<HTMLDivElement>(null);
  const accentPathRef = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(0);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (accentPathRef.current) setPathLength(accentPathRef.current.getTotalLength());
  }, [pathD]);

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
        const viewportAnchor = window.innerHeight * 0.65;
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
    <main className={styles.page}>
      <Link href={backHref} className={styles.backLink}>
        ← Volver
      </Link>
      <h1 className={styles.title}>El camino de {petName}</h1>
      <p className={styles.lead}>Desde que llegó a la familia hasta hoy.</p>

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
            <path
              ref={accentPathRef}
              d={pathD}
              className={styles.pathAccent}
              style={{
                strokeDasharray: pathLength || 1,
                strokeDashoffset: pathLength ? pathLength * (1 - progress) : 0,
              }}
            />
          </svg>

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
    </main>
  );
}
