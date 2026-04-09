import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Triple Impacto - Panel de Administración",
  description:
    "Sistema de gestión de información de residuos reciclables - Cochabamba, Bolivia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${ibmPlexSans.variable} antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
