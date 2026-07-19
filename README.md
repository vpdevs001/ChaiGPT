# ChaiGPT

A ChatGPT-style AI chat app built with Next.js. Sign in, start a conversation, and stream replies from an OpenAI model in real time — with persistent history, a sidebar of chats, pin/rename/delete, on-demand web search with cited sources, conversation branching, and light/dark theming.

## Tech stack

| Layer          | Choice                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Framework      | [Next.js 16](https://nextjs.org) (App Router, Server Actions)          |
| Language       | TypeScript                                                             |
| Auth           | [Clerk](https://clerk.com)                                             |
| Database       | PostgreSQL via [Prisma](https://www.prisma.io) (`@prisma/adapter-pg`)  |
| AI / streaming | [Vercel AI SDK](https://ai-sdk.dev) + `@ai-sdk/openai` (Responses API) |
| Data fetching  | [TanStack Query](https://tanstack.com/query)                           |
| UI             | Tailwind CSS v4, shadcn/ui, Base UI, `next-themes`                     |

## Features

- **Auth & onboarding.** Sign-in with Clerk; a `User` row is created automatically the first time someone lands on `/`, before they're dropped into a new chat.
- **Streaming chat.** Replies stream token-by-token from `POST /api/chat` and are persisted to Postgres as they arrive.
- **Web search.** A "Search" toggle in the composer forces OpenAI's built-in `web_search` tool on; even with it off, the model is instructed to search whenever a question needs current information. Search status ("Searching the web for…") and source-domain links render inline under the reply.
- **Conversation management.** Create, rename, pin/unpin, and delete conversations from the sidebar, sorted pinned-first then by recent activity.
- **Branching.** Hovering any message reveals a small branch icon. Clicking it clones the conversation — up to and including that message — into a new chat titled `branch - <original title>`, so you can explore a different reply or direction without losing the original thread.
- **Theming.** Light/Dark/System toggle with a checkmark showing the active mode.

## Project structure

Application code is organized **by feature**, not by file type. Each feature under `features/` owns its own `actions/` (Next.js Server Actions), `hooks/` (TanStack Query hooks), `components/` (feature-specific UI), and `utils/`:

```
features/
├── auth/            Clerk-backed auth helpers (requireUser, onBoard)
├── conversation/     Conversation CRUD + branching, sidebar UI, chat shell layout
├── messages/         Message rendering, composer (incl. search toggle), branch button
├── ai/               Chat model config (Responses API) + AI SDK message persistence (chat-store)
└── home/             Logic for the "/" route (onboards + starts a new chat, or shows the landing page)
```

Each feature exposes a barrel `index.ts` so you can import from the feature root, e.g.:

```ts
import { useConversations } from "@/features/conversation";
```

Everything else follows standard Next.js App Router conventions:

```
app/
├── page.tsx                 "/" — onboards + redirects a signed-in user into a new chat,
│                             or renders the landing page for signed-out visitors
├── (auth)/                  Sign-in route group (public)
│   └── sign-in/[[...sign-in]]/  Clerk's sign-in page
├── (root)/                  Authenticated route group
│   ├── layout.tsx           Protects routes, re-runs onboarding, renders ChatShell (sidebar + content)
│   └── c/[id]/page.tsx      "/c/:id" → loads one conversation + its message history
├── api/chat/route.ts        Streaming chat endpoint — registers the web_search tool,
│                             forces it when the client's search toggle is on, saves messages
└── layout.tsx                Root layout: Clerk, React Query, theme, toasts

components/
├── ui/                      shadcn/ui primitives (button, dialog, sidebar, toggle, dropdown-menu, ...)
├── ai-elements/              AI SDK UI building blocks (message, conversation, loader)
└── providers/                App-wide providers (React Query, theme)

lib/                          Shared, non-feature infra (db client, query key factory, cn util)
prisma/                       Schema + migrations
proxy.ts                      Clerk middleware (Next 16's proxy.ts) — protects routes,
                              explicitly sets signInUrl: "/sign-in"
```

When adding new functionality, prefer creating/extending a feature folder over dropping files into `lib/` or `components/` — those are reserved for truly cross-feature/shared code.

## Getting started

### Prerequisites

- Node.js 20+ (or [Bun](https://bun.sh), which this repo also supports via `bun.lock`)
- A PostgreSQL database
- A [Clerk](https://dashboard.clerk.com) application
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable                            | Description                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string                                  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key                                         |
| `CLERK_SECRET_KEY`                  | Clerk secret key                                              |
| `OPENAI_API_KEY`                    | OpenAI API key — used for chat completions **and** web search |

### 3. Set up the database

```bash
npx prisma migrate dev
```

This applies the migrations in `prisma/migrations` and generates the Prisma client into `lib/generated/prisma`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signing in for the first time will sync your Clerk account into the database and drop you into a fresh chat.

## Available scripts

| Script          | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the Next.js dev server |
| `npm run build` | Production build             |
| `npm run start` | Start the production server  |
| `npm run lint`  | Run ESLint                   |

## Database

The schema (`prisma/schema.prisma`) has three models:

- **User** — mirrors the Clerk user (`clerkId` is the link back to Clerk).
- **Conversation** — a chat thread; tracks title, an optional per-thread `model`/`systemPrompt` override, pin/archive state, and `lastMessageAt` for sidebar ordering.
- **Message** — a single turn in a conversation; stores both plain `content` and the raw AI SDK `parts` (text, tool calls, search sources) so the UI — including search status and source links — can be fully reconstructed on reload. A `parentId` column exists for future message-level branching, though the current branching feature works at the conversation level (cloning into a new chat).

Run `npx prisma studio` to browse data locally.
