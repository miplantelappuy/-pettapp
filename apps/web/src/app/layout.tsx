import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PettApp",
};

// Space Grotesk (display, look moderno/geométrico para el sistema glass) sí
// está en Google Fonts. General Sans (cuerpo) NO está en Google Fonts — se
// sirve desde el CDN público de Fontshare. Ambas opciones evitan instalar un
// paquete npm nuevo (no hace falta correr `npm install` en ningún lado).
// Fraunces queda cargada también: los estilos de álbum (cinematográfico,
// vintage-polaroid) la siguen usando a propósito — son la excepción
// deliberada al lenguaje glass, ver globals.css.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=swap"
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
