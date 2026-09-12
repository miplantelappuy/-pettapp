// Service worker mínimo, solo para poder recibir notificaciones push del
// navegador (Web Push estándar). No cachea nada ni convierte esto en una PWA
// offline todavía — eso es una decisión aparte para más adelante.

self.addEventListener("push", (event) => {
  let data = { title: "PettApp", body: "Tenés una novedad." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // si el payload no es JSON válido, se usa el mensaje genérico de arriba
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
