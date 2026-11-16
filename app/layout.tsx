import { Suspense } from "react";
import type { Metadata } from "next";
import {
  Courier_Prime,
  JetBrains_Mono,
  Press_Start_2P,
} from "next/font/google";
import { Nav } from "@/components/nav";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juegos arcade online para competir por puntos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      // Extensiones del navegador inyectan atributos en <html> antes de hidratar.
      suppressHydrationWarning
      className={`${pressStart.variable} ${jetbrains.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <AuthProvider>
            {/* usePathname() en Nav bloquea el prerender de rutas dinámicas
                (/juegos/[id]) con cacheComponents: va en Suspense. */}
            <Suspense fallback={<nav className="av-nav" />}>
              <Nav />
            </Suspense>
            <main className="av-main">{children}</main>
            <footer
              style={{
                borderTop: "1px solid var(--line)",
                padding: "20px 32px",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
              }}
            >
              © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
            </footer>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
