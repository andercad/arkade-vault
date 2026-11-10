import Link from "next/link";
import { ActivitySection } from "@/components/home/activity-section";
import { FeaturesSection } from "@/components/home/features-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { GamesSection } from "@/components/home/games-section";
import { PricingSection } from "@/components/home/pricing-section";
import { FloatingSilhouettes } from "@/components/home/silhouettes";
import { StatsSection } from "@/components/home/stats-section";

export default function Home() {
  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/juegos" className="btn xl pulse">
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link href="/login" className="btn xl magenta">
              ✦ CREAR CUENTA
            </Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      <FeaturesSection />
      <GamesSection />
      <StatsSection />
      <ActivitySection />
      <PricingSection />
      <FinalCtaSection />
    </div>
  );
}
