import { NextResponse, type NextRequest } from "next/server";
import { LocalFsStorage } from "@/lib/storage";

// Solo existe cuando STORAGE_PROVIDER=local. Sustituye a la URL firmada real
// de R2 para poder probar el flujo de subida en desarrollo sin credenciales
// de Cloudflare. En producción esta ruta ni se usa.
export async function PUT(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Falta key" }, { status: 400 });

  const buffer = Buffer.from(await request.arrayBuffer());
  await new LocalFsStorage().writeLocal(key, buffer);

  return NextResponse.json({ ok: true });
}
