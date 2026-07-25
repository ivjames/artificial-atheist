import { notFound } from "next/navigation";
import { CHAT_ENABLED } from "@/lib/config";

// DRAFT — not final legal text. This is a full structural draft of the Privacy
// Policy for counsel to red-line and finalize before launch (see
// LAUNCH-BLOCKERS.md §1), with special attention to religion/belief as
// special-category data (spec §6). Every legal-basis, retention, processor-DPA,
// international-transfer, and contact/entity decision we cannot make for you is
// marked inline with <Counsel>. Do not launch on this text as-is. Gated with
// the rest of the chat surface so nothing draft-legal is exposed until the
// system goes live.
export const dynamic = "force-dynamic";

// Inline marker for the decisions/verifications a qualified lawyer or the
// business owner must supply. Rendered visibly and easy to grep ("Counsel:").
function Counsel({ children }: { children: React.ReactNode }) {
  return (
    <em className="font-semibold text-amber-600 dark:text-amber-500">
      [Counsel: {children}]
    </em>
  );
}

export default function PrivacyPage() {
  if (!CHAT_ENABLED) notFound();
  return (
    <article className="card mx-auto mt-10 max-w-2xl p-8">
      <h1 className="text-2xl font-black">Privacy Policy</h1>
      <p className="mt-2 text-sm font-semibold text-amber-600">
        DRAFT — pending legal review. This is a working draft prepared for
        counsel to finalize, not a final policy. Do not rely on it as a complete
        description of your legal rights.
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Last updated: <Counsel>effective date on publication</Counsel>. The
        controller responsible for your data is{" "}
        <Counsel>legal entity name, form, and postal address</Counsel>.
      </p>

      <div className="mt-6 space-y-6 text-slate-600 dark:text-slate-300">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            1. Who this applies to
          </h2>
          <p>
            This policy covers the debate chat agent and account system. It
            applies to adults 18 and older; the Service is not offered to minors,
            who are diverted to the quiz before any signup (see §11).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            2. What we collect
          </h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>Your email address</strong>, used for passwordless,
              magic-link sign-in and for account-related notices.
            </li>
            <li>
              <strong>Your conversations</strong> with the debate agent (the
              messages you send and the agent&rsquo;s replies), and the threads
              and topics they belong to.
            </li>
            <li>
              <strong>Credit and purchase records</strong> — your credit balance
              and ledger, and the amount, pack, and timestamp of any purchase. We
              do <strong>not</strong> store your card number; Stripe handles that
              (see §5).
            </li>
            <li>
              <strong>Consent records</strong> — whether and when you accepted
              the Terms and whether you opted in to article-use, so we can honor
              your choices.
            </li>
            <li>
              <strong>Limited technical data</strong> — for example your IP
              address and request timing, used to rate-limit abuse and keep the
              Service secure, and a signed session cookie so you stay signed in.
            </li>
          </ul>
          <p>
            <Counsel>
              confirm this inventory matches what the app actually stores and
              logs (review the Prisma models and server/nginx logs), and add any
              analytics or error-monitoring tooling if enabled.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            3. Why we use it, and our legal basis
          </h2>
          <p>
            We use your data to run the Service: to sign you in, to generate the
            agent&rsquo;s replies, to meter and account for credits, to process
            purchases, to prevent abuse and secure the Service, and — only with
            your separate opt-in — to help inform site articles.
          </p>
          <p>
            <Counsel>
              confirm the legal basis for each purpose under GDPR/UK GDPR and any
              other applicable regime. A typical mapping: providing the chat and
              managing your account = performance of a contract; abuse-prevention
              and security = legitimate interests; article-use = consent. Note
              the special rule for the content of conversations in §4.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            4. Conversations about religion and belief (special-category data)
          </h2>
          <p>
            Conversations with the agent are about belief and religion. In many
            jurisdictions (for example under GDPR and UK GDPR), data revealing
            religious or philosophical beliefs is{" "}
            <strong>special-category data</strong> subject to extra protection.
            We call this out explicitly rather than treating it as ordinary
            account data.
          </p>
          <p>
            <Counsel>
              identify and state the Article 9 condition relied on to process
              this content. The most likely basis for a discussion service is the
              user&rsquo;s <strong>explicit consent</strong> — if so, the signup
              flow must capture explicit, informed, specific consent to
              processing conversation content that may reveal beliefs, separate
              from the general Terms acceptance, and the withdrawal path must be
              clear. Confirm this against the current consent model (unbundled{" "}
              <code>terms</code> vs <code>article_use</code>) and decide whether a
              third, explicit consent for core processing of special-category
              content is required.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            5. Third parties who process your data
          </h2>
          <p>
            We share data with a small number of processors who act on our
            instructions:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>AI model providers</strong> — your conversation content is
              sent to third-party AI providers to generate replies (currently
              Anthropic, and optionally Mistral for EU users).
            </li>
            <li>
              <strong>Stripe</strong> — processes card payments directly; we
              never see or store full card numbers.
            </li>
            <li>
              <strong>Email delivery</strong> — sends your magic-link sign-in and
              account emails.
            </li>
            <li>
              <strong>Hosting</strong> — the server infrastructure the Service
              runs on.
            </li>
          </ul>
          <p>
            <Counsel>
              before launch, name each processor and confirm a signed DPA is in
              place with terms appropriate to special-category conversation data:
              no training on your data, bounded retention, and a lawful
              international-transfer mechanism where relevant (LAUNCH-BLOCKERS.md
              §2). List the concrete no-training / retention commitments per
              provider once signed, and name the email and hosting vendors.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            6. International transfers
          </h2>
          <p>
            <Counsel>
              state where data is processed and, for EU/UK users whose data
              leaves the EEA/UK, the transfer mechanism relied on (e.g. adequacy
              decision, Standard Contractual Clauses / UK Addendum). This ties to
              the Mistral-EU processing option noted in the launch blockers.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            7. How long we keep it
          </h2>
          <p>
            We keep data only as long as needed for the purposes above or as
            required by law, then delete or anonymize it.
          </p>
          <p>
            <Counsel>
              set concrete retention periods for each category — account/email,
              conversation content, credit/purchase records (note tax/accounting
              minimums often apply to purchase records), consent records, and
              security logs — and confirm the deletion/erasure flow
              (lib/erasure.ts) actually removes or anonymizes each of them within
              those windows.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            8. Article-use consent (optional and revocable)
          </h2>
          <p>
            We may use conversations to help write articles for the site, but
            only if you <strong>separately opt in</strong> — this is never
            required to use the chat. If you opt in, articles are always
            synthesized across many people&rsquo;s conversations, never published
            as your verbatim conversation, and only after a human-review step and
            a PII-scrub pass intended to remove identifying details. You can
            withdraw this consent at any time from your account page; withdrawing
            it stops future use and does not affect your ability to use the
            Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            9. Your rights
          </h2>
          <p>
            Depending on where you live, you may have the right to access,
            correct, delete, export, or restrict processing of your data, to
            object to certain processing, and to withdraw consent at any time
            (withdrawal does not affect processing already carried out). From your
            account page you can withdraw article-use consent and request
            deletion/erasure of your account and associated data. You also have
            the right to complain to a data-protection supervisory authority.
          </p>
          <p>
            <Counsel>
              confirm the full rights list and response timelines for each
              applicable regime (GDPR/UK GDPR, and US state laws such as CCPA/CPRA
              if you serve those users), how to exercise rights beyond the
              in-app flow, and the identity-verification step for erasure/access
              requests.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            10. Cookies and security
          </h2>
          <p>
            We use a signed session cookie so you stay signed in; it is
            necessary for the Service to work and is not used for advertising. We
            take reasonable technical and organizational measures to protect your
            data, but no system is perfectly secure.{" "}
            <Counsel>
              confirm the cookie inventory and whether a cookie notice/banner is
              required for your setup, and describe your security measures at an
              appropriate level.
            </Counsel>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            11. Age and minors
          </h2>
          <p>
            This service is for adults 18 and older. Visitors who indicate they
            are under 18 are diverted to a quiz before any signup, so no account
            or conversation data is collected from them. A mid-conversation check
            redirects users who identify themselves as minors during a chat.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            12. Changes to this policy
          </h2>
          <p>
            We may update this policy as the Service changes. For material changes
            we will update the &ldquo;Last updated&rdquo; date and, where
            appropriate, notify you by email or an in-app notice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            13. Contact and complaints
          </h2>
          <p>
            To exercise your rights or ask about this policy, contact us at{" "}
            <Counsel>
              privacy contact email and legal entity/postal address
            </Counsel>
            . <Counsel>
              if you appoint an EU/UK representative or DPO, name them here, and
              name the lead supervisory authority for complaints.
            </Counsel>
          </p>
        </section>
      </div>
    </article>
  );
}
