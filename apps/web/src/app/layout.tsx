import "./globals.css";

// Fraunces (texto emocional/display) sí está en Google Fonts.
// General Sans (utilidad) NO está en Google Fonts — se sirve desde el CDN
// público de Fontshare. Ambas opciones evitan instalar un paquete npm nuevo
// (no hace falta correr `npm install` en ningún lado).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
