# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online games platform to compete for points. Currently a fresh `create-next-app` scaffold (only `app/page.tsx`, `app/layout.tsx`, `app/globals.css`). Course project (Udemy, Section 8: Skills + Playwright MCP).

Workflow is Spec Driven Design using `/spec` and `/spec-impl` skills, installed via `npx skills@latest add Klerith/fernando-skills` (see README.md). Sibling project `../../Section 7.../arkanoid` used the same flow (specs in `specs/`).

## Specs

Specs en `specs/` (01 MVP pantallas, 02 homepage, 03 about/contacto, 04 Supabase cimientos, 05 Asteroids, 06 leaderboard y juegos). Leer la spec relevante y sus dependencias antes de implementar.

Buenas prácticas:

- Una spec por cambio: `specs/NN-nombre.md`. Crear con `/spec`, implementar con `/spec-impl`.
- Cabecera: Estado, Depende de, Fecha, Objetivo. Secciones: Por qué, Alcance (dentro/fuera), Plan, Criterios de aceptación, Decisiones, Riesgos.
- No salir del alcance; lo extra va a "Fuera de alcance" / spec futura.
- Un commit por paso (`NN-nombre: Paso N`). Al terminar, Estado → Implementado.

## Stack

Next.js 16.4.6 (App Router, `app/` at repo root, no `src/`), React 19.3, Tailwind CSS 4 (`@tailwindcss/turbopack`), TypeScript. Path alias `@/*` → repo root. Next.js has breaking changes vs. training data: read `node_modules/next/dist/docs/` before writing code.

## Skills

Usa siempre /frontend-design para diseñar interfaces de usuario
