import type { NextConfig } from "next";

// SPEC 17: headers de seguridad básicos en todas las rutas (CSP/HSTS: spec futura).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  // Orígenes extra para `npm run dev` desde otro dispositivo de la LAN (p. ej. el móvil).
  // Lista separada por comas en ALLOWED_DEV_ORIGINS; vacío por defecto.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
