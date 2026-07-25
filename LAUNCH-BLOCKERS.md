# Launch blockers — debate chat system

The chat/credit/article system is **built but dark**. `CHAT_ENABLED=false` keeps
every chat surface (routes, pages, contact gate, APIs) returning 404 and
collects **no** email or conversation data. Do not flip it to `true` until the
items below are cleared. This is a deliberate design choice driven by concept
spec §6 (consent/privacy is the real risk area).

## Hard blockers (legal — get a lawyer, per spec §6 / §10)

1. **Consent & privacy legal review.** Religion/belief is *special-category*
   data in some jurisdictions (GDPR and similar). Before collecting any contact
   info or conversation:
   - Confirm the **unbundled, opt-in, revocable** article-use consent model is
     sufficient (it is implemented: `Consent` with `terms` vs `article_use`,
     and access never depends on `article_use`).
   - Draft real **Terms** and **Privacy Policy** (the app ships placeholder
     pages at `/terms` and `/privacy` — replace them). *Status: `/terms` and
     `/privacy` now carry full-structure drafts (all sections present, every
     open decision marked inline as `[Counsel: …]`). Still NOT counsel-reviewed —
     this blocker stays open until a lawyer finalizes the marked items (entity,
     governing law, retention windows, refund policy, liability, the Article 9
     basis for special-category conversation data, and transfer mechanism).*
   - Confirm the **right-to-erasure** flow (`lib/erasure.ts`) meets the
     applicable standard.
2. **Model-provider data terms (DPA).** Every Slot A/B/C provider processes
   special-category conversation data. Required per provider before it serves
   traffic: no-training-on-your-data, bounded retention, a signed DPA, and (for
   EU-resident users) EU processing or a valid transfer mechanism. Anthropic and
   Mistral-EU are the intended production providers. **Grok is intentionally not
   wired** (parked pending ZDR + DPA, spec §3/§6).
3. **Age-gate rationale holds across the domain boundary.** Minors are diverted
   to the quiz *before* the contact gate. Verified: the quiz collects no contact
   PII (only an optional, self-supplied leaderboard display name). Keep the quiz
   under the same privacy policy until/if it fully migrates.

## Mitigation in place — region gate (GDPR sidestep)

A region gate now declines the chat surface to EU/EEA + UK visitors
(`middleware.ts` + `lib/geo.ts`, defense-in-depth in `app/signup/actions.ts`;
on by default when `CHAT_ENABLED=true`, fails closed on unknown region). This
**narrows** §1 and §2 by keeping GDPR-jurisdiction special-category data out of
the system, but does **not** clear them:
   - §1 still needs the Terms/Privacy finalized and a (lighter, non-EU) legal
     review — the service still collects US special-category data.
   - §2 still needs signed provider DPAs with no-training + bounded-retention
     terms for the traffic actually served; the EU-transfer requirement is what
     the gate removes.
   - **Depends on infra:** nginx GeoIP2 must set the country header on the
     droplet, or the gate fails closed and blocks everyone. Wire it in the
     go-live runbook and verify before flipping `CHAT_ENABLED=true`.

## Operational blockers (before real users)

4. **Session secret.** Set a strong `SESSION_SECRET` (`openssl rand -base64 32`).
5. **Provider keys.** Set `ANTHROPIC_API_KEY` (and `MISTRAL_API_KEY` if using the
   EU alternative).
6. **Email transport.** The magic-link contact gate uses a **console** transport
   by default (logs the link to the server log). Set `SMTP_URL` for real
   delivery before launch, or nobody can verify their email.
7. **Payments.** Stripe is wired but **keys are not provisioned**, so the app
   defaults to a **dev stub** (`PAYMENTS_PROVIDER=stub`) that grants credits with
   **no real charge**. The stub must NEVER run in production with real users.
   Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` and
   `PAYMENTS_PROVIDER=stripe` before taking money.
8. **Abuse controls (spec §8).** Free 5 questions per email + free-to-mint email
   = trivial farming. Mitigations in place: quota grants only after magic-link
   verify; rate-limiting on signup (per-IP + per-email) and chat (per-user) via
   `lib/ratelimit.ts`. **Caveat:** the limiter is in-memory/per-process — fine
   for the single pm2 instance, but back it with Redis before scaling
   horizontally, and consider a CAPTCHA/email-domain checks if farming persists.
9. **Admin token.** Set `ADMIN_TOKEN` to reach `/review/pipeline` (the article
   review queue). Unset = the admin surface 404s.
10. **DB migration.** Run `prisma migrate deploy` on the droplet (adds the chat
    tables; the quiz tables are untouched).

## Not blockers, but decide before/at launch (spec §9)

- Slot B long-form **writing eval** vs Gemini 3.1 Pro (Sonnet pick is
  provisional for article writing).
- Cluster threshold exact number (`CLUSTER_MIN_USERS`, start 6).
- Whether the free tier (Haiku) converts, and whether the premium (Sonnet) tier
  earns its complexity — A/B at launch.
- Editorial-labor cost and article-pipeline ROI are unmodeled.

*Not legal advice. §6 items need a qualified lawyer before any data is collected.*
