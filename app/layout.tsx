import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/**
 * Tipografía editorial técnica: IBM Plex family.
 * Serif para títulos (papel autoritativo).
 * Sans para body (legible, profesional, no genérico).
 * Mono para códigos y datos (consistencia con Plex).
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SGI Multinorma — MSU",
  description: "Sistema de Gestión Documental Multinorma de MSU. ISO 9001, 14001, 45001, BRCGS, GlobalGAP, BPA.",
  robots: "noindex, nofollow", // Sistema interno: no indexar
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
