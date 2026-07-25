# Debate chat + credit + article pipeline

This app hosts two products under `artificialatheist.com`: the **Atheism IQ quiz**
(existing, at `/quiz`) and the **debate chat agent** + credit system + article
pipeline (new, per the concept spec v1.1). Everything chat-related is **dark
behind `CHAT_ENABLED`** until the legal review clears — see `LAUNCH-BLOCKERS.md`.

## Hosting topology

The static Eleventy site (the `artificial-atheist` repo) serves `/` and articles.
nginx path-routes the dynamic prefixes to this Next.js app on `127.0.0.1:8060`:
`/chat`, `/age`, `/signup`, `/quiz`, `/leaderboard`, `/result`, `/account`,
`/pricing`, `/review`, `/terms`, `/privacy`, `/api`, `/_next`. Config:
`artificial-atheist/deploy/nginx-artificialatheist.com.conf`. (The review queue
is at `/review`, not `/admin` — the existing AA admin dashboard owns `/admin`.)

## Region gate — GDPR sidestep (`middleware.ts`, `lib/geo.ts`)

To avoid collecting special-category (religion/belief) conversation data from
GDPR/UK-GDPR data subjects before full EU compliance is in place, the chat
surface is region-gated. `middleware.ts` runs on the data-collection paths only
(`/age`, `/signup`, `/chat`, `/account`, `/pricing`, `/api/auth`)
— the quiz product (`/quiz`, `/leaderboard`, `/result`, `/api/questions`),
`/terms`, `/privacy`, `/review`, and `/api/payments` are never gated (the Stripe
webhook is provider-to-server and would fail closed if gated). Blocked page loads
redirect to `/unavailable`; blocked actions/APIs get a `451`. `app/signup/actions.ts`
re-checks server-side (`lib/geo-server.ts`) at the email-persist moment as
defense-in-depth.

Country comes from a **single trusted** proxy header (default `x-country-code`)
— no spoofable fallbacks; **the proxy must set it AND strip any client-supplied
copy** (nginx's GeoIP2 module on the droplet). Default block set is EU/EEA + UK;
unknown region **fails closed**.
On by default when `CHAT_ENABLED=true`. All tunable via env (see `.env.example`:
`GEO_GATE_ENABLED`, `GEO_COUNTRY_HEADER`, `GEO_BLOCKED_COUNTRIES`,
`GEO_ALLOWED_COUNTRIES` for strict US-only, `GEO_FAIL_OPEN`, `GEO_DEFAULT_COUNTRY`
for local dev). This is **risk reduction, not compliance** — geolocation is
imperfect; counsel should still bless it.

## Pre-launch preview lock (`lib/preview.ts`)

Set `CHAT_PREVIEW_TOKEN` (with `CHAT_ENABLED=true`) to make the chat surface
**private** without HTTP basic-auth: the only way in is to open any chat URL
once with `?preview=<token>` (mints a 30-day `aa_preview` cookie); everyone else
gets a 404, and a valid preview cookie bypasses the region gate. Enforced in
`middleware.ts` (takes precedence over the region gate) and re-checked in
`lib/geo-server.ts`. Leave the token unset for public launch. Lets you exercise
the full flow end-to-end pre-launch with no public exposure and no GeoIP2/legal
prerequisites.

## Access & credit flow (spec §4)

1. `/age` — 18+ self-declaration. Under-18 → `/quiz` (never reaches signup).
2. `/signup` — contact gate: email + Terms (required) + **optional, unbundled,
   revocable** article-use consent (§6). Magic-link email (no passwords).
3. `/api/auth/verify` — verifies the link, starts a session, grants the free
   quota (5 questions), → `/chat`.
4. `/chat` — the debate agent. Credits meter usage; premium tier costs more.
   A **per-user history panel** lists past conversations (most-recent first) and
   reopens any of them — resumable if still open, read-only once ended. The page
   still opens on a fresh chat (no silent auto-resume); history is opt-in per
   click. Read side: `lib/chat/history.ts` (`listThreadSummaries` /
   `getThreadForUser`, both ownership-scoped, redacted messages excluded);
   `loadThread` server action; `components/chat/ChatHistory.tsx`.
5. `/pricing` — buy credit packs when the balance runs out.
6. `/account` — balance, consent toggle, delete-my-data (erasure).

## Model architecture — three provider-abstracted slots (spec §3)

All model calls go through `lib/models/router.ts#callSlot(slot, req)`. Slots and
their defaults (all env-overridable, `lib/config.ts`):

| Slot | Job | Default | Env |
|---|---|---|---|
| `standard` | chat default | Claude Haiku 4.5 | `MODEL_STANDARD*` |
| `premium` | deep-debate chat | Claude Sonnet | `MODEL_PREMIUM*` |
| `writer` | Slot B article writer | Claude Sonnet | `MODEL_WRITER*` |
| `scrub` | Slot C PII scrub | Claude Sonnet | `MODEL_SCRUB*` |

Providers live in `lib/models/{anthropic,mistral}.ts` behind one interface; add a
vendor by implementing `ModelProvider` and registering it in the router. Mistral
Large 3 is the documented EU-jurisdiction alternative for `standard`.

## Article pipeline (spec §5) — `lib/pipeline/*`, `/review/pipeline`

1. Threads are topic-tagged (`tagging.ts`).
2. `runClustering()` counts **distinct consented users** per topic; at
   `CLUSTER_MIN_USERS` (default 6) it creates an `ArticleDraft`. Never one user.
3. Slot B `draftArticle()` **synthesizes across** users — never a transcript dump.
4. Slot C `scrubArticle()` strips contextual re-identifiers + flags residual risk.
5. A human reviews every draft at `/review/pipeline` and approves. Approval stages
   an AA-formatted markdown file in `pipeline-output/` to be committed into the
   `artificial-atheist` repo's `src/posts/` (the cross-repo bridge). Nothing
   auto-publishes.

Run clustering/drafting: `npm run pipeline:cluster`, `npm run pipeline:draft <id>`
(intended as a droplet cron; needs DB + provider keys).

## Data model

New Prisma models (migration `20260724000000_chat_credit_pipeline`, quiz tables
untouched): `User`, `LoginToken`, `Consent`, `CreditEntry` (append-only ledger,
balance = sum), `Purchase`, `Thread`, `Message`, `ArticleDraft`.

## Deploy

`prisma migrate deploy` adds the new tables. Set the env in `.env` (see
`.env.example`): `CHAT_ENABLED`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`,
optionally `MISTRAL_API_KEY`, `SMTP_URL`, Stripe keys, `ADMIN_TOKEN`. Keep
`CHAT_ENABLED=false` until the `LAUNCH-BLOCKERS.md` items clear.
