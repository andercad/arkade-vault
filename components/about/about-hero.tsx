import { Reveal } from "@/components/home/reveal";
import { HighlightIcon, type HighlightIconKind } from "./highlight-icon";

const HIGHLIGHTS: { i: HighlightIconKind; t: string; c: string }[] = [
  { i: "HEART", t: "HECHO CON ❤️ PARA JUGADORES", c: "magenta" },
  { i: "BROWSER", t: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", c: "cyan" },
  { i: "PLANT", t: "PROYECTO EN CONSTANTE CRECIMIENTO", c: "green" },
];

export function AboutHero() {
  return (
    <>
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y
          celebrar los arcades que definieron una generación, haciéndolos accesibles para todos, en
          cualquier lugar y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.i} className={`highlight ${h.c}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      <Reveal className="about-divider" ariaHidden>
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 80}ms` }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </Reveal>
    </>
  );
}
