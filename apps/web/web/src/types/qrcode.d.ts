// Declaración mínima propia en vez de sumar @types/qrcode como dependencia
// aparte — igual que web-push.d.ts, solo tipamos lo que realmente usamos
// (ver surfaces/account/qr/page.tsx).
declare module "qrcode" {
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
}
