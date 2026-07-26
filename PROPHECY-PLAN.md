# Prophecy Analysis Module — Phase 0 Integration Plan

Deliverable required by `PROPHECY-HANDOFF.md` ("Required first deliverable").
Audit of the existing app, the integration decisions, and the phase-by-phase
mapping. No implementation code is included; this document is the gate for
Phase 1.

Conventions in this doc: "handoff" = `PROPHECY-HANDOFF.md`; paths are
repo-relative; all module models/routes are namespaced `Prophecy*` /
`/prophecy/…` to keep them separable from quiz/chat/pipeline data.

---

## 1. Existing authentication and authorization patterns

Two disjoint systems; neither is general-purpose auth.

1. **Visitor auth (chat): magic-link email.** `User` (email, no password, no
   role), `LoginToken` (stores only the SHA-256 hash of the emitted token),
   `lib/auth/session.ts` + `lib/auth/tokens.ts`. The entire chat surface —
   and therefore this auth path in practice — is dark behind
   `CHAT_ENABLED=false` (`lib/config.ts`, `envBool`), pending
   `LAUNCH-BLOCKERS.md`. Not usable as a contributor identity system today.
2. **Admin auth: single shared token.** `ADMIN_TOKEN` env, checked against an
   httpOnly cookie `aa_admin`. Implementation:
   `app/(app)/review/pipeline/auth.ts` — `adminToken()`, `isAdminAuthed()`;
   every server action re-checks via an `assertAdmin()` helper; an unset token
   → `notFound()` (the surface simply doesn't exist). `/review/adversary`
   reuses the same cookie and is deliberately **not** gated on `CHAT_ENABLED`
   because it is an operator/eval tool.

**Decision:** the prophecy editorial surface uses system (2), exactly like
`/review/adversary`: `app/(app)/review/prophecy/…` gated on the `aa_admin`
cookie, not on `CHAT_ENABLED`. Public read pages need no auth. No new auth
infrastructure. See §11 for the role-matrix simplification this forces.

## 2. Existing user and role models

- `User` has **no role column** and no roles table. There is no
  contributor/reviewer/admin distinction anywhere in the schema.
- The handoff prohibits duplicate role infrastructure, and building real roles
  on the dark magic-link `User` would violate the chat legal gate (real emails
  must not be collected while `CHAT_ENABLED=false`).

**Decision:** MVP authorization is binary — admin-token holder has full
editorial rights; everyone else is read-only on published content.
Reviewer *identity* (required by the handoff for attribution, not access) is
modelled as `ProphecyReviewer` rows (stable pseudonym + declared perspective),
created and assigned by the admin, **not** linked to `User`. A nullable
`userId` can be added later when real auth exists. Explicit scope decision,
documented in §11.

## 3. Existing Prisma naming and migration conventions

From `prisma/schema.prisma` (single file, provider `postgresql` — the SQLite
header comment is stale) and `prisma/migrations/`:

- PascalCase models, camelCase fields; `String @id @default(cuid())`.
- **No Postgres enums.** Status/kind fields are `String` with the allowed
  values listed in a comment (e.g. `ArticleDraft` statuses, `CreditEntry.kind`).
- **JSON as JSON-encoded String TEXT columns** (e.g. `AdversaryRun.transcript`,
  `metrics`), never native `Json`.
- `createdAt DateTime @default(now())`; explicit `@@index` on query paths;
  heavy explanatory comments per model.
- Migrations: `prisma/migrations/<timestamp>_<snake_case>/`, generated with
  `prisma migrate dev`; applied on deploy via `npm run db:deploy` =
  `prisma migrate deploy && prisma db seed`.
- `prisma/seed.ts` is idempotent/deploy-safe: skips when data is present,
  `SEED_FORCE=1` to reset; it runs on **every** deploy.

The prophecy schema (§8) follows all of the above verbatim: cuid ids, string
statuses with comment-documented value sets, TEXT-encoded JSON for snapshots
and citation payloads, explicit indexes, additive-only migrations.

## 4. Reusable layouts, forms, cards, tables, filters, pagination, typography, navigation

- **Layout:** `app/(app)/` route group = the dynamic surface; its layout is a
  `max-w-3xl` container. The publication surface is separate (`.aa-pub` CSS,
  `app/publication.css`). Prophecy pages (public and admin) go in `(app)`.
- **Styling primitives:** `app/globals.css` utility classes — `.card`,
  `.btn-primary`, `.btn-ghost` — plus Tailwind with `dark:` variants. That is
  the design system; there is no component library.
- **Admin UI pattern:** `app/(app)/review/pipeline/page.tsx` —
  `force-dynamic` server components, server actions in a colocated
  `actions.ts` (`"use server"`), plain `<form action={...}>`, no client state
  libraries. Pages render simple card lists.
- **Not available:** generic table, filter, or pagination components. None
  exist. Prophecy admin lists will be card lists with query-param filters and
  simple offset/cursor "more" links, hand-rolled like the pipeline page.
  Building a generic table component is out of scope until a second consumer
  needs it.
- **Navigation:** `lib/site.ts` `nav[]` (`NavItem`); the Debate item is
  conditionally hidden — the precedent for feature-gated nav entries.

## 5. Server actions, route handlers, validation, error handling, logging, tests

- **Mutations:** server actions per the pipeline pattern; every action begins
  with `assertAdmin()`. Prophecy actions follow identically (one `actions.ts`
  per admin route segment, each action re-checks auth).
- **Reads/API:** App Router route handlers; `/api/articles?q=…` is the
  read-only JSON endpoint precedent. Trailing-slash form is canonical for
  external callers (`next.config.mjs` `trailingSlash: true`).
- **Validation:** manual — no zod anywhere. Prophecy actions validate
  explicitly (required fields, status-transition legality, score 0–5 range,
  vocab-key existence) and return/render terse error strings. Do not add zod.
- **Error handling/logging:** minimal; `console.error` plus safe fallbacks.
  No logging framework to integrate with. Keep it that way.
- **Tests:** vitest, `tests/*.test.ts`, pure-function unit tests only — no DB
  integration tests exist. Prophecy tests therefore target pure logic:
  status-transition validators, entry→claim mapping invariants, import-parse
  and idempotency-key derivation, rating validation, CSV/JSON serialization.
  DB-touching behavior (merge, revision snapshots) gets its logic extracted
  into pure functions so it is testable without a DB harness.
- **Commands:** `npm run test` / `typecheck` / `lint` / `build`
  (build = `prisma generate && next build`). CI (`ci.yml`) runs build + the
  duplicate-slug guard; prophecy adds no CI steps in MVP.

## 6. Search infrastructure and extensibility

- Publication search: static client-side index (`app/search-index.json`) —
  irrelevant to DB-backed prophecy data.
- DB search: `lib/articles.ts` `searchArticles` using Prisma
  `contains`/`mode: "insensitive"` queries; exposed read-only at
  `/api/articles?q=…`.
- **No pg_trgm, no FTS, no extensions in any migration.** Per the handoff,
  consider them only after checking conventions — checked: not established.

**Decision:** MVP prophecy search = Prisma `contains` insensitive over claim
text/slug/summary + structured filters (status, tradition, category vocab,
direction, source list), mirroring `searchArticles`. It is fine at MVP scale
(hundreds to low thousands of rows). `pg_trgm`/`tsvector` is a deliberate
later upgrade delivered as its own additive migration (`CREATE EXTENSION` +
index) once corpus size or fuzzy-matching needs (duplicate detection, Phase 5)
justify it — flagged in §10 because `CREATE EXTENSION` needs DB privileges.

## 7. Proposed routes and navigation placement

All inside `app/(app)` (max-w-3xl container, existing typography).

```text
Public read (Phase 4; render only status=published):
  app/(app)/prophecy/                       overview / entry point
  app/(app)/prophecy/claims/                claims index + filters
  app/(app)/prophecy/claims/[slug]/         the public claim page (13-section layout per handoff)
  app/(app)/prophecy/sources/[slug]/        source detail
  app/(app)/prophecy/lists/                 source lists + entry provenance
  (people/places/events pages later, same pattern)

Admin editorial (Phase 2; aa_admin cookie, NOT CHAT_ENABLED-gated):
  app/(app)/review/prophecy/                dashboard: counts, pending review queue
  app/(app)/review/prophecy/imports/        batch upload (CSV/JSON), batch detail, entry triage
  app/(app)/review/prophecy/claims/         claim CRUD, entry mapping, merge, relationships
  app/(app)/review/prophecy/claims/[id]/    edit surface: interpretations, fulfillments,
                                            evidence, objections, resolutions, evaluations
  app/(app)/review/prophecy/vocab/          controlled vocabularies
  app/(app)/review/prophecy/reviewers/      ProphecyReviewer management
  (each segment: page.tsx + actions.ts, per the pipeline pattern; auth helper
   imported from the existing review auth module rather than duplicated)

API (read-only, trailing-slash canonical):
  app/api/prophecy/claims/                  JSON list + q/filters (pattern: /api/articles)
  app/api/prophecy/claims/[slug]/           full claim JSON
  app/api/prophecy/export/                  ?format=json|csv normalized export (MVP item 15)
```

**Nav:** add a "Prophecy" `NavItem` to `lib/site.ts` **only at Phase 4**, when
public pages exist. Phases 1–3 ship no nav change; admin reaches
`/review/prophecy/` by URL, same as `/review/pipeline/`. All URLs get trailing
slashes; do not touch `trailingSlash: true`.

## 8. Proposed Prisma schema additions and relationships

Already decided; recorded here, not redesigned. ~24 models, all `Prophecy*`
prefixed, religion-neutral, following §3 conventions (cuid ids, String
statuses documented in comments, JSON-in-TEXT, `@@index` on foreign keys and
query paths).

Text/reference layer:

- `ProphecyTradition` — tradition (Christianity, secular criticism, …).
- `ProphecyCorpus` → belongs to Tradition. Document collection.
- `ProphecyDocument` → belongs to Corpus (Isaiah, Matthew, …).
- `ProphecyPassage` → belongs to Document; canonical ref fields
  (book/chapter/verse ranges). Reference only — no translation text.
- `ProphecyQuotation` → belongs to Passage; translation-specific short text +
  translation/tradition label. Keeps copyrighted text limited and separable.

Provenance layer:

- `ProphecySource` — bibliographic record; `type` string (book, article,
  website, inscription, …).
- `ProphecySourceList` → belongs to Source; a circulated claim list.
- `ProphecySourceListEntry` → belongs to SourceList + ImportBatch; verbatim
  original wording/numbering/references, parse + mapping status.
- `ProphecyImportBatch` — one upload: filename, format, counts, status,
  raw-row payloads (JSON TEXT), idempotency identity.

Claim layer:

- `ProphecyClaim` — normalized neutral proposition; `slug` unique; `status`
  (draft|submitted|needs_changes|approved|published|rejected|archived|superseded).
- `ProphecyClaimEntryMap` — many-to-many Entry↔Claim with `matchType`
  (exact|partial|compound|duplicate|near_duplicate|disputed), confidence,
  rationale. This is what exposes inflated totals.
- `ProphecyInterpretation` → Claim/Passage; method (vocab), perspective/
  tradition, `predatesFulfillment`.
- `ProphecyFulfillment` → Claim; evidentiary `direction`
  (internal|external|mixed|not_testable) + rationale.
- `ProphecyEvidence` — polymorphic `targetType`+`targetId`; `direction`
  (supports|opposes|mixed|contextual), type (vocab), summary, source link.
- `ProphecyObjection` → any assertion; `ProphecyResolution` → Objection
  (competing resolutions allowed, none auto-accepted).
- `ProphecyEvaluation` — `targetType`+`targetId`, dimension (vocab), score
  0–5, label, rationale, citations, reviewer, perspective, confidence,
  `status` draft|submitted|approved|superseded|rejected. **Never overwritten:
  corrections create a new row and mark the old one superseded.**
- `ProphecyCitation` — structured biblio + rendered string + URL; attached to
  specific assertions via join rows on each parent (not page-level).

Cross-reference and governance layer:

- `ProphecyPerson` / `ProphecyPlace` / `ProphecyEvent` — reusable entities.
- `ProphecyRelationship` — `fromClaimId`/`toClaimId` + `type` from the
  controlled list (duplicate_of, depends_on, contradicts, …).
- `ProphecyVocabTerm` — controlled vocabularies, `kind`+`key` unique; kinds:
  category, subjectCategory, interpretationMethod, relationshipType,
  evidenceType, ratingDimension. Seeded data, admin-editable — per the
  handoff's explicit preference and the repo's no-enum convention.
- `ProphecyRevision` — `targetType`+`targetId`, JSON snapshot (TEXT), editor,
  note. Written on every canonical mutation; powers rollback and audit.
- `ProphecyReviewer` — stable pseudonym + declared perspective; admin-created;
  no `User` link in MVP (§2).

```text
Tradition ─< Corpus ─< Document ─< Passage ─< Quotation
Source ─< SourceList ─< SourceListEntry >─ ImportBatch
SourceListEntry >──ClaimEntryMap──< Claim ─< Interpretation ──> Passage
                                   Claim ─< Fulfillment
                                   Claim >─Relationship─< Claim
Evidence ──(targetType+targetId)──> {Claim|Interpretation|Fulfillment|Objection|Resolution}
Objection ──> {assertion} ; Resolution ──> Objection
Evaluation ──(targetType+targetId)──> {assertion} ; Evaluation >── Reviewer
Citation ──(join rows)──> {any substantive assertion}
Revision ──(targetType+targetId)──> {any canonical record}
Person/Place/Event <── links from Claim/Fulfillment/Evidence
VocabTerm (kind+key) ← referenced by string key from typed fields
```

Polymorphic `targetType`+`targetId` pairs (Evidence, Evaluation, Revision,
Citation joins) trade referential integrity for schema economy — consistent
with the codebase's pragmatism; integrity is enforced in the server actions
and covered by pure-function tests.

## 9. Migration and seed strategy

- **Migrations:** one additive migration per phase-sized change, starting with
  `<timestamp>_prophecy_domain` (Phase 1: all core tables + indexes).
  Generated via `prisma migrate dev` locally, applied on the droplet by
  `db:deploy`'s `migrate deploy`. Purely additive: new tables only; zero
  `ALTER`/`DROP` on existing quiz/chat/credit/pipeline/article tables. Later
  prophecy changes stay additive (new nullable columns, new tables).
- **Seed:** extend `prisma/seed.ts` with a `ProphecyVocabTerm` seeding block
  following its existing idempotent pattern — upsert-by-`kind`+`key` (or skip
  if the vocab table is populated), safe under `SEED_FORCE=1`, safe to run on
  every deploy. Seeded content: the handoff's category, subjectCategory,
  interpretationMethod, relationshipType, evidenceType, and ratingDimension
  lists (prediction-, fulfillment-, and resolution-quality dimensions).
- **What is NOT seeded:** the 324-entry dataset. Per the handoff, content
  arrives through the import workflow (Phase 3), never seed files. Traditions/
  corpora/documents are created via admin UI, not seed (small counts, and
  seeding content rows would blur the source-of-truth line).
- **Import idempotency:** `ProphecyImportBatch` + a stable per-entry identity
  (source list + original entry number/hash) makes re-import a no-op/update,
  never a silent duplicate — enforced in the import action, tested as a pure
  function over parsed rows.

## 10. Deployment impact, rollback, environment changes

- **Deploy:** unchanged pipeline — git push → webhook → `deploy.sh`
  (`git reset --hard`, `npm ci`, `npm run db:deploy`, `npm run build`,
  restart). Prophecy rides it with zero modifications to `deploy.sh`.
- **Env changes: none for MVP.** Admin gate reuses `ADMIN_TOKEN`. No new
  secrets, no new services, no nginx changes, no new ports. Phase 6 AI
  features reuse the existing Anthropic key/provider abstraction.
- **Build impact:** public prophecy pages are dynamic (DB-backed) like the
  rest of `(app)`; no SSG coupling, no effect on the publication build or the
  dup-slug guard.
- **Rollback:** matches the repo's model — `git revert` + redeploy. This works
  only because migrations are additive: reverted code simply ignores the
  prophecy tables, which remain in place, harmless. Therefore **no destructive
  DDL, ever** (no down-migrations on the droplet, no `db:reset` — standing
  rule). Data-level mistakes roll back via `ProphecyRevision` snapshots, not
  schema surgery.
- **Deferred flagged item:** enabling `pg_trgm`/FTS later requires
  `CREATE EXTENSION` inside a migration, which needs sufficient DB privileges
  on the droplet — if the app role lacks them, that becomes the one small SSH
  handoff for the owner, documented when it happens (handoff permits exactly
  this shape of exception).

## Phase mapping (handoff Phases 0–6)

- **Phase 0 — audit:** this document. Gate: plan accepted.
- **Phase 1 — domain schema:** `prophecy_domain` migration (§8), vocab seeds
  (§9), `lib/prophecy/` domain helpers (status-transition validator, mapping
  invariants, rating validation) + vitest unit tests for them. Gate:
  `typecheck`/`lint`/`test`/`build` green; deploy is a no-op for users.
- **Phase 2 — admin workflow:** `app/(app)/review/prophecy/…` (§7) — CRUD for
  traditions→sources→lists, CSV/JSON import with verbatim preservation,
  claim creation, entry↔claim mapping, interpretations/fulfillments/evidence/
  objections/resolutions, evaluations with citations, relationships, vocab
  management, admin search/filter, merge-with-provenance, revision writes,
  JSON/CSV export endpoints. All server actions `assertAdmin()`-guarded.
  Gate: MVP capabilities 1–15 exercisable end-to-end by the admin.
- **Phase 3 — first dataset:** identify ONE concrete "324 prophecies" list,
  record its exact provenance, import it through the Phase 2 importer (never
  seeds), begin normalization/mapping. No published findings; counts come from
  reviewed data only. Gate: every entry preserved verbatim, batch re-import
  idempotent.
- **Phase 4 — public browsing:** public routes (§7), published-only
  visibility, claim page with the handoff's 13 separated sections, filters,
  internal/external labeling shown without verdict framing. Add "Prophecy" to
  `lib/site.ts` nav **now**, not earlier. Gate: public pages render only
  `published` records; build + CI green.
- **Phase 5 — editorial analysis:** complete dedup (merge tooling hardening),
  full dimensional ratings, objections/resolutions coverage, dataset summary
  pages generated from reviewed data. Candidate point to add `pg_trgm` for
  near-duplicate search (§6, §10).
- **Phase 6 — optional AI assistance:** draft-only AI (duplicate detection,
  tagging, draft evaluations) through the existing provider abstraction; every
  output stored as a draft with model/prompt-version/time/disposition. Only
  after Phase 5 is reliable.

## Scope simplifications (explicit decisions)

1. **Roles collapsed to admin-token vs. public.** The handoff's
   anonymous/registered/contributor/reviewer/admin matrix requires real
   accounts; AA has none usable (magic-link `User` is dark behind the legal
   gate, has no roles, and parallel role infra is prohibited by the handoff
   itself). MVP: admin token = contributor + reviewer + administrator;
   anonymous = read published. `ProphecyReviewer` preserves reviewer
   *attribution* (pseudonym + perspective on every evaluation) without
   granting access. Revisit when real auth ships; the schema already leaves
   room (nullable `userId` later).
2. **No registered-user features** (bookmarks, community reviews, suggestion
   submission) until real auth exists. Community-vs-editorial rating
   separation is preserved structurally (Evaluation rows are typed by
   reviewer), just unpopulated on the community side.
3. **Search is `contains`-based** until scale or dedup needs force pg_trgm.
4. **No generic table/filter/pagination components** — card lists per the
   pipeline pattern; componentize only when a second consumer appears.
5. **No new tests infrastructure** — pure-function vitest only; DB behavior is
   factored into testable pure logic rather than adding a DB test harness.

## Risks

- **Polymorphic targets** (Evidence/Evaluation/Revision/Citation) have no FK
  integrity; a bad `targetType`+`targetId` write orphans rows. Mitigation:
  all writes go through validated server actions; a small admin "integrity
  check" report page in Phase 2 is cheap insurance.
- **Single shared admin token** means no per-editor attribution at the auth
  layer. Mitigation: every canonical mutation requires selecting a
  `ProphecyReviewer`/editor identity, recorded in `ProphecyRevision.editor`.
  Honest limitation until real auth.
- **Merge complexity** (dedupe without provenance loss) is the hardest MVP
  invariant: merging claims must re-point `ClaimEntryMap`, relationships, and
  children while marking the loser `superseded`, never deleting. Mitigation:
  merge is implemented as a pure planning function (tested) + one transaction.
- **Schema breadth** (~24 models) risks a stalled half-built module.
  Mitigation: phase gates above; Phase 1 ships the whole schema (cheap,
  additive) but Phase 2 UI is built in dependency order (sources → import →
  claims → mapping first; evaluations last).
- **Copyright:** quotations are short and translation-labelled
  (`ProphecyQuotation`), links over reproduction; import preserves list
  entries (facts/short text), not book contents.
- **Droplet-local DB** means imports and any data surgery run on the droplet
  (like `articles:sync` and adversary runs) — scripts must be resilient to
  being run there over SSH, and never in the Actions generator.
