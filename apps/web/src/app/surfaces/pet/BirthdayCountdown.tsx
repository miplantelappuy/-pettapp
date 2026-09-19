"use client";

import { useEffect, useState } from "react";
import { getNextBirthdayInfo } from "@/lib/age";
import styles from "./BirthdayCountdown.module.css";

interface Props {
  petName: string;
  birthDate: string | null;
}

interface Ticks {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

// Cuenta regresiva en vivo al próximo cumpleaños — arranca en null a
// propósito (no en el primer valor calculado) para que el primer render en
// el servidor y en el navegador coincidan siempre exactamente igual (los
// dos ven "Calculando…"); el valor de verdad recién se calcula en el
// navegador, en un useEffect, así nunca depende de a qué hora exacta
// terminó de armarse la página en el servidor.
export function BirthdayCountdown({ petName, birthDate }: Props) {
  const [ticks, setTicks] = useState<Ticks | null>(null);
  const [isToday, setIsToday] = useState(false);

  useEffect(() => {
    if (!birthDate) return;

    function tick() {
      const info = getNextBirthdayInfo(birthDate);
      if (!info) return;
      if (info.isToday) {
        setIsToday(true);
        setTicks(null);
        return;
      }
      setIsToday(false);
      const diff = Math.max(0, info.target.getTime() - Date.now());
      setTicks({
        days: Math.floor(diff / DAY_MS),
        hours: Math.floor((diff % DAY_MS) / HOUR_MS),
        minutes: Math.floor((diff % HOUR_MS) / MINUTE_MS),
        seconds: Math.floor((diff % MINUTE_MS) / 1000),
      });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [birthDate]);

  if (!birthDate) return null;

  return (
    <div className={`${styles.card} glassStrong`}>
      <div className={styles.confetti} aria-hidden>
        <span className={styles.confettiHeart}>💛</span>
        <span className={styles.confettiHeart}>💜</span>
        <span className={styles.confettiHeart}>🧡</span>
      </div>

      <span className={styles.cake} aria-hidden>
        🎂
      </span>

      {isToday ? (
        <p className={styles.celebration}>¡Feliz cumpleaños, {petName}! 🎉🐾</p>
      ) : ticks ? (
        <>
          <p className={styles.heading}>Faltan para el cumple de {petName}</p>
          <div className={styles.digits}>
            <Unit value={ticks.days} label="días" />
            <span className={styles.sep} aria-hidden>
              :
            </span>
            <Unit value={ticks.hours} label="hs" />
            <span className={styles.sep} aria-hidden>
              :
            </span>
            <Unit value={ticks.minutes} label="min" />
            <span className={styles.sep} aria-hidden>
              :
            </span>
            <Unit value={ticks.seconds} label="seg" />
          </div>
        </>
      ) : (
        <p className={styles.heading}>Calculando…</p>
      )}
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.unit}>
      <span className={styles.unitValue}>{String(value).padStart(2, "0")}</span>
      <span className={styles.unitLabel}>{label}</span>
    </div>
  );
}
