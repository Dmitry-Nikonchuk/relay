# Relay

Relay is a modern AI chat app built with Next.js and Cloudflare. It gives users a clean chat workspace, model switching, persistent history, profile-based plan visibility, and server-side guardrails around AI usage.

The product direction is simple:

- `Free` gives access to free models only.
- `Pro` is positioned around access to premium models and heavier usage.
- Chats are persistent, authenticated, and optimized for day-to-day use rather than one-off demos.

## Product Surface

Relay currently includes:

- Google sign-in with database-backed sessions
- private chat workspace and profile page
- streaming AI responses
- chat history and editable titles
- model selection in chat
- guardrails for rate limiting, request caps, and tier-based model access
- retry/recovery flow for interrupted assistant replies
- structured logging for chat lifecycle and failures
- product-facing pricing and legal pages

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Auth.js / NextAuth
- Cloudflare Workers + OpenNext
- Cloudflare D1
- OpenRouter for model routing

## Architecture Notes

Key pieces in the current codebase:

- `src/app/(home)`:
  landing page, pricing section, and marketing surface
- `src/app/chat`:
  authenticated chat workspace
- `src/app/profile`:
  account view plus plan and usage summary
- `src/app/api/chat/*`:
  chat CRUD, history, send, stream, and title generation APIs
- `src/shared/lib/guardrails`:
  policy checks, usage accounting, and denial handling
- `src/features/chat/server`:
  streaming, persistence, recovery, memory, and chat-specific failures
- `migrations/`:
  D1 schema evolution for chats, auth, guardrails, and pending replies

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create `.env.local` with at least:

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=
OPENROUTER_SUMMARY_MODEL=
```

Notes:

- `OPENROUTER_MODEL` is the default chat model.
- `OPENROUTER_SUMMARY_MODEL` is used for chat memory / summarization flows.
- The app expects a Cloudflare D1 binding named `DB`.

### 3. Apply migrations

Local D1 migrations:

```bash
pnpm db:migrate:local
```

Remote D1 migrations:

```bash
pnpm db:migrate:remote
```

`pnpm dev` also runs local migrations first through the `predev` script.

### 4. Start the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Useful Scripts

```bash
pnpm dev
pnpm build
pnpm build:cf
pnpm preview
pnpm cf:deploy
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm format
pnpm db:status
pnpm db:migrate:local
pnpm db:migrate:remote
```

## Deployment

Relay is set up for Cloudflare deployment via OpenNext.

Main config lives in:

- `wrangler.jsonc`
- `cloudflare-env.d.ts`
- `.open-next/` output generated during build

Typical deployment flow:

```bash
pnpm build:cf
pnpm cf:deploy
```

## Data Handling Summary

Relay processes several data categories as part of normal operation:

- account data from Google sign-in
- session data for authenticated access
- chat content, titles, and message history
- chat memory / summary records
- token usage, rate-limit, and guardrail telemetry
- failure and retry metadata for chat reliability

Prompts and responses are sent to OpenRouter and then to the selected model provider for inference. If you plan to run Relay publicly, review and customize the legal pages before launch.

## Legal Pages

The app includes:

- `/privacy`
- `/data-policy`
- `/terms`

These pages are written to match the current product behavior, but they are still product templates, not legal advice. If you operate Relay publicly, replace any operator placeholders with your legal entity details and have counsel review the final text.

## Current Plan Positioning

- `Free`:
  free models only, persistent chat, product guardrails, and usage tracking
- `Pro`:
  intended for premium model access and heavier work

The exact model catalog and tier policy live in `src/shared/config/chatModelCatalog.ts`.

## Quality Checks

Before shipping changes, at minimum run:

```bash
pnpm typecheck
pnpm lint
```

## Status

Relay is already beyond a raw prototype: it has authentication, persistence, streaming, guardrails, recovery logic, pricing copy, and a clearer legal surface. The next product steps are likely billing, operator configuration, and a more explicit production support flow.
