# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: online games platform to compete for points. Currently a fresh `create-next-app` scaffold (only `app/page.tsx`, `app/layout.tsx`, `app/globals.css`). Course project (Udemy, Section 8: Skills + Playwright MCP).

Workflow is Spec Driven Design using `/spec` and `/spec-impl` skills, installed via `npx skills@latest add Klerith/fernando-skills` (see README.md). Sibling project `../../Section 7.../arkanoid` used the same flow (specs in `specs/`).

## Stack

Next.js 16.4.6 (App Router, `app/` at repo root, no `src/`), React 19.3, Tailwind CSS 4 (`@tailwindcss/turbopack`), TypeScript. Path alias `@/*` → repo root. Next.js has breaking changes vs. training data: read `node_modules/next/dist/docs/` before writing code.

## Skills
Usa siempre /frontend-design para diseñar interfaces de usuario