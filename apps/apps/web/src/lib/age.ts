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
