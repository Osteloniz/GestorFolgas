# AGENTS.md

## Project Context

This is a Next.js application for managing holiday compensation campaigns. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Architecture

- Next.js App Router for the web application and server routes.
- Neon PostgreSQL with Drizzle ORM for persistence.
- Better Auth for login, sessions, authorization, and TOTP.
- Vercel is the target hosting platform.

## Key Files

- `src/`: frontend application source.
- `src/app/`: Next.js routes and API handlers.
- `src/auth/`: Better Auth server and browser clients.
- `src/db/`: Drizzle schema, client, and migrations.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `npm run dev` for local development.
- Keep server-side authorization and database validation as the source of truth.
- Do not restore SDKs, CLIs, configuration, or deployment paths from the retired platform.
- Keep deployment compatible with Vercel and document any required environment variables.
- Run the relevant checks from `package.json` before finishing code changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
