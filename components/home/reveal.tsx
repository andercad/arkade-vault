"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({
  className = "",
  ariaHidden,
  children,
}: {
  className?: string;
  ariaHidden?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={`${className} reveal`.trim()}
      aria-hidden={ariaHidden || undefined}
    >
      {children}
    </section>
  );
}
