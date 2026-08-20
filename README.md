# Competition Coach

AI mentors for high-school competitions. Chat with friendly coaches for the
**Regeneron Science Talent Search** and the **Congressional App Challenge** —
brainstorming, feedback, deadlines, and up-to-date answers via live web search.

Built with Next.js 16 (App Router), the Vercel AI SDK, OpenAI, Supabase, and
Tailwind CSS.

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io)
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- (Optional) A [Tavily](https://tavily.com) API key for live web search

## Local setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Copy the example file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Required | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** service role key. Never expose to the client. |
   | `OPENAI_API_KEY` | Yes | Used to generate coach replies. |
   | `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
   | `TAVILY_API_KEY` | No | Enables the `web_search` tool. Coaches work without it. |

3. **Set up the database**

   In the Supabase SQL editor, run the scripts in `scripts/` in order:

   1. `scripts/001_create_schema.sql` — creates the `assistants`,
      `conversations`, and `messages` tables (with row-level security enabled).
   2. `scripts/002_seed_assistants.sql` — seeds the two starter coaches. Safe to
      re-run.
   3. `scripts/003_create_auth.sql` — creates the `users` and `sessions` tables
      for email/password sign-in.
   4. `scripts/004_create_documents.sql` — creates the `documents` table that
      stores uploaded PDF/DOCX text so it persists across a conversation.

4. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Until the database and
   keys are configured, the home page shows a friendly "almost ready" preview
   instead of live coaches.

## Production build

```bash
pnpm build
pnpm start
```

## Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add every variable from `.env.example` under
   **Settings → Environment Variables** (Production, Preview, and Development as
   needed).
3. Run the two SQL scripts against your Supabase project (once).
4. Deploy. Vercel auto-detects Next.js — no extra configuration required.

`@vercel/analytics` is included and only loads in production.

## How it works

- **Document uploads.** In a chat you can attach a **PDF or Word (`.docx`)**
  document (up to 10 MB). It's uploaded to `app/api/documents/extract/route.ts`,
  where the text is extracted server-side (`unpdf` for PDFs, `mammoth` for DOCX)
  and capped at 100k characters. The extracted text is saved to the `documents`
  table and **re-injected into the coach's context on every turn**, so the coach
  can keep referring to it across follow-up questions — not just the turn it was
  uploaded on (combined document text is capped at 120k characters). A short
  marker (`📎 Attached document: …`) is saved in the transcript. Scanned/image-only
  PDFs have no extractable text and are rejected with a friendly message.
- **Email/password auth.** Users sign up or sign in at `/login`. Passwords are
  hashed with a salted [scrypt](https://en.wikipedia.org/wiki/Scrypt) digest
  (`lib/auth/password.ts`, Node's built-in `crypto` — no extra dependency) and
  only the hash is stored. Sign-in creates an opaque session token, stored in an
  http-only, `secure`, `sameSite=lax` cookie and looked up server-side on each
  request (`lib/auth/session.ts`).
- **Per-user chat history.** Conversations and messages are keyed to the signed-in
  user's id. Every page and API route resolves the user from the session cookie
  and scopes queries by owner, so one user can never read another's chats.
- **Server-only Supabase access.** All database access uses the service role key
  from server code (`lib/supabase/server.ts`). RLS is on and no anon policies are
  granted, so the database is never reachable from the browser.
- **Streaming chat.** `app/api/chat/route.ts` streams responses with the AI SDK
  and persists the transcript (including `web_search` tool calls) to Supabase.

## Project structure

```
app/            App Router pages (login, home, chat) and API routes (auth, chat, documents)
components/     UI components (auth form, chat, sidebar, shadcn/ui primitives)
lib/            Supabase client, auth (password + session), document extraction, data access, types
scripts/        SQL: schema + seed data + auth tables
public/         Icons and static assets
```
