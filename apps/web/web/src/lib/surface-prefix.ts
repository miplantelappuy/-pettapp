import { headers } from "next/headers";

// El middleware deja en este header el prefijo que hay que anteponerle a
// cualquier link INTERNO a la superficie actual (ver middleware.ts). Server
// components lo leen acá; si un componente cliente necesita el valor, se lo
// pasa como prop ya resuelto desde su page.tsx (mismo criterio que
// albumHref/backHref en la superficie "pet").
export async function getSurfacePrefix(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-surface-prefix") ?? "";
}
