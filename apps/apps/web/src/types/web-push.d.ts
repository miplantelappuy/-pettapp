// Declaración mínima propia en vez de depender de que @types/web-push exista
// y esté sincronizado con la versión instalada — solo tipamos lo que
// realmente usamos (ver lib/push.ts).
declare module "web-push" {
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;

  export function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload?: string,
  ): Promise<{ statusCode: number }>;
}
