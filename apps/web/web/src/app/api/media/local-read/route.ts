import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Falta key" }, { status: 400 });

  const dir = process.env.LOCAL_STORAGE_DIR ?? "./.storage";
  try {
    const data = await readFile(join(dir, key));
    return new NextResponse(data);
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
