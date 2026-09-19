// Frase de edad "emocional", no un dato clínico de dashboard.
// Respeta `birthDatePrecision` porque no todas las mascotas tienen fecha
// exacta de nacimiento (muchas son adoptadas y se sabe el año, o el mes, nomás).

type BirthPrecision = "exact" | "month" | "year";

export function formatPetAge(
  birthDate: string | null | undefined,
  precision: BirthPrecision | string = "exact",
): string | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) months = 0;

  if (precision === "year") {
    const years = Math.floor(months / 12);
    return years < 1 ? "Menos de un año" : `${years} ${years === 1 ? "año" : "años"}`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years === 0) {
    if (months === 0) return "Recién llegado";
    return `${months} ${months === 1 ? "mes" : "meses"}`;
  }

  if (remMonths === 0) {
    return `${years} ${years === 1 ? "año" : "años"}`;
  }

  return `${years} ${years === 1 ? "año" : "años"} y ${remMonths} ${remMonths === 1 ? "mes" : "meses"}`;
}

export interface NextBirthdayInfo {
  /** true todo el día del cumpleaños (no solo al momento exacto) — ese día
   * se festeja, no se cuenta hacia atrás hasta la medianoche. */
  isToday: boolean;
  /** Medianoche del próximo cumpleaños (o de hoy, si isToday). */
  target: Date;
}

// Para la cuenta regresiva del Home (ver BirthdayCountdown.tsx). Usa
// siempre el mes/día de birthDate sin importar birthDatePrecision — si el
// dueño cargó una fecha aproximada (mes o año nomás), la cuenta regresiva
// también es aproximada, pero mostrar nada sería menos útil que mostrar
// algo con esa salvedad. Se parsea el string a mano (no `new Date(str)`)
// para no depender de en qué huso horario corre el navegador de quien mira
// la pantalla: un string "2024-06-15" tiene que significar el 15 de junio
// para todo el mundo, no el 14 para alguien en UTC-3.
export function getNextBirthdayInfo(birthDate: string | null | undefined): NextBirthdayInfo | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  const now = new Date();

  if (now.getMonth() + 1 === month && now.getDate() === day) {
    return { isToday: true, target: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  }

  let target = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);
  if (target.getTime() < now.getTime()) {
    target = new Date(now.getFullYear() + 1, month - 1, day, 0, 0, 0, 0);
  }
  return { isToday: false, target };
}
