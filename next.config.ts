import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Orígenes extra para `npm run dev` desde otro dispositivo de la LAN (p. ej. el móvil).
  // Lista separada por comas en ALLOWED_DEV_ORIGINS; vacío por defecto.
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
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
