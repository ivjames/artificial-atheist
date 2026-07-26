# Prophecy Analysis Module — Implementation Handoff

## Purpose

Build a structured prophecy-claims knowledge base as a first-class module inside the existing Artificial Atheist application.

The module must collect as many unique prophecy claims as practical, preserve the wording and provenance of source lists, normalize duplicate claims, separate original texts from later interpretations and alleged fulfillments, and make the evidence and disagreements searchable and transparent.

The initial corpus is Christian prophecy, especially the commonly circulated claim that Jesus fulfilled 324 prophecies. The schema and application design must remain religion-neutral so other traditions and secular prophetic claim sets can be added later without restructuring the system.

This is not a standalone application and must not introduce a second backend, account system, deployment process, or design language.

## Existing application constraints

Read `CLAUDE.md`, `README.md`, `HANDOFF.md`, the Prisma schema, authentication code, shared components, and deployment documentation before implementation.

The current application is a single Next.js 15 application using:

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Existing server-side application authentication
- Existing shared layouts and components
- Nginx as a thin reverse proxy
- One DigitalOcean droplet
- Git-triggered deployment through the existing `deploy.sh`
- One Next process on port 8060

Do not add Django, FastAPI, Docker, AWS, a separate database, or a separate runtime.

Prefer extending existing AA systems over adding parallel infrastructure.

## Required first deliverable

Before implementing the feature, audit the repository and produce a concise integration plan covering:

1. Existing authentication and authorization patterns.
2. Existing user and role models.
3. Existing Prisma naming and migration conventions.
4. Reusable layouts, forms, cards, tables, filters, pagination, typography, and navigation.
5. Existing server actions, route handlers, validation, error handling, logging, and test patterns.
6. Existing search infrastructure and whether it can be extended.
7. Proposed routes and navigation placement.
8. Proposed Prisma schema additions and relationships.
9. Migration and seed strategy.
10. Deployment impact, rollback strategy, and any required environment changes.

Do not begin broad implementation until that audit is complete. Small exploratory code is acceptable only when necessary to validate the plan.

## Product principles

The system must distinguish clearly between:

- the source passage
- the normalized prophecy claim
- an interpretation of that passage
- an alleged fulfillment
- evidence supporting or opposing the fulfillment
- objections
- proposed resolutions
- evaluations by reviewers

Do not collapse these into a single record.

The application must show why a claim is rated strongly or weakly. It must not present an unexplained truth score.

The system should preserve disagreement rather than overwrite it. Multiple reviewers and interpretive perspectives may evaluate the same material independently.

Every substantive assertion, rating, objection, or resolution should support citations.

## Scope decisions already made

- Public read access.
- Invite-only contributors.
- Canonical edits require administrator approval.
- Reviewer identity or stable pseudonym and declared perspective are visible.
- Christian prophecy is the initial content scope.
- The schema is religion-neutral from the start.
- Editorial ratings and community ratings remain separate.
- Written rationale and citations are required for formal ratings.
- Store source links and limited quotations rather than reproducing copyrighted works wholesale.
- AI-assisted importing, duplicate detection, tagging, and draft evaluation are deferred until the core workflow is functional.
- The first release is admin-first. Public presentation follows once the editorial workflow is usable.

## Suggested route structure

Use the existing App Router conventions and adjust names after the repository audit.

```text
/prophecy
/prophecy/claims
/prophecy/claims/[slug]
/prophecy/passages/[id]
/prophecy/sources/[slug]
/prophecy/people/[slug]
/prophecy/places/[slug]
/prophecy/events/[slug]
/prophecy/reviewers/[slug]
/prophecy/imports
/prophecy/admin
```

Public and protected routes should use the existing route-group and authorization conventions rather than creating an isolated admin application.

## Core conceptual model

```text
Source list
  -> source list entry preserved verbatim
  -> normalized unique claim
  -> one or more source passages
  -> one or more interpretations
  -> one or more alleged fulfillments
  -> supporting and opposing evidence
  -> objections and proposed resolutions
  -> reviewer evaluations
```

A source-list entry is not itself the canonical claim.

Many list entries may map to one normalized claim. One list entry may also contain several distinct claims and therefore require a many-to-many mapping with explanatory notes.

This separation is required to expose inflated prophecy totals caused by duplicates, passage splitting, typology, repeated wording, and compound claims.

## Core entities

Exact Prisma model names may be adapted to existing conventions, but the domain must support these entities.

### Tradition

A religious or nonreligious tradition associated with a corpus, source, interpretation, claimant, or reviewer perspective.

Examples: Christianity, Judaism, Islam, Latter-day Saints, secular historical criticism.

### Corpus

A collection of documents.

Examples: Hebrew Bible, New Testament, Quran, Book of Mormon, Sibylline Oracles.

### Document

A text within a corpus.

Examples: Isaiah, Micah, Matthew.

### Passage

A stable reference to a portion of a document.

Store canonical reference data separately from quotations and translations. Support multiple textual traditions and translations without treating them as interchangeable.

### Source

Bibliographic or documentary provenance.

Source types should include books, articles, academic papers, websites, inscriptions, manuscripts, archaeological reports, videos, primary texts, and secondary scholarship.

### Source list

A published or circulated collection of prophecy claims.

Examples: a specific “324 prophecies” list, apologetics websites, books, denominational lists, or critical compilations.

### Source list entry

The original numbered or ordered item exactly as presented by its source list.

Preserve:

- original wording
- original numbering
- source URL or bibliographic reference
- source-specific passage references
- source-specific fulfillment references
- import date
- notes

### Claim

The normalized, unique proposition being evaluated.

Examples:

- A future ruler would come from Bethlehem.
- The Messiah would be born of a virgin.
- Tyre would be permanently destroyed.

A claim should be written neutrally and should not embed the verdict.

### Claim-to-entry mapping

Maps source-list entries to normalized claims.

Support:

- exact match
- partial match
- compound entry
- duplicate
- near duplicate
- disputed mapping
- mapping confidence
- mapping rationale

### Interpretation

An identified reading of a passage or claim.

Store:

- perspective or tradition
- description
- interpretive method
- original historical context
- whether the reading is documented before or only after the alleged fulfillment
- supporting citations

Suggested interpretive methods include direct prediction, messianic interpretation, historical-context reading, typology, allegory, dual fulfillment, sensus plenior, retrospective reinterpretation, and post-event prophecy.

### Fulfillment claim

A specific assertion that an event, person, or condition fulfilled the normalized claim.

Store it separately from the underlying event and from evidence that the event occurred.

### Evidence item

A source-backed item supporting, opposing, qualifying, or contextualizing a claim, interpretation, fulfillment, objection, or resolution.

Store:

- evidence type
- direction: supports, opposes, mixed, contextual
- target entity
- summary
- source
- date or date range
- relationship to the originating tradition
- independence level
- directness
- reliability notes
- citations

### Objection

A formal challenge to a claim, interpretation, fulfillment, evidence item, or evaluation.

### Resolution

A proposed answer to an objection. A resolution is not automatically accepted merely because it exists.

Support multiple competing resolutions and evaluations of each resolution.

### Evaluation

A reviewer’s dimensional assessment of a claim, interpretation, fulfillment, evidence set, objection, or resolution.

Never overwrite another reviewer’s evaluation.

### Tag and category

Use controlled categories for major classifications and flexible tags for discovery.

### Person, place, and event

Reusable entities for cross-referencing claims and evidence.

### Relationship

Generic cross-references between claims and related domain objects.

Required relationship types should include at least:

- duplicate_of
- potential_duplicate_of
- derived_from
- depends_on
- contradicts
- supports
- responds_to
- reinterprets
- shares_passage_with
- shares_fulfillment_with
- part_of_composite_claim
- allegedly_fulfilled_by
- quoted_by
- alludes_to

### Revision and moderation records

Canonical records require revision history, attribution, status, and approval state.

## Evidentiary direction

Every claim and fulfillment should be classifiable by evidentiary direction.

### Internal

The prophecy and its fulfillment are established primarily through sources inside the same religious tradition.

Example: an Old Testament passage is interpreted as predicting Jesus and a Gospel written within the Christian tradition supplies the fulfillment narrative.

### External

The alleged fulfillment can be evaluated substantially through evidence independent of the originating tradition.

Example: a prediction about a named ruler, city, war, destruction, date, political event, astronomical event, or archaeological condition.

### Mixed

The record includes both internal and external evidence.

### Not testable

The claim lacks a practical external test or a clear failure condition.

Store the classification and a rationale. Do not infer that internal means false or external means true.

## Prediction-quality dimensions

Use a fixed scale, initially 0 through 5, with labels and written rationale.

Suggested labels:

```text
0 absent
1 very weak
2 weak
3 mixed
4 strong
5 very strong
```

Evaluate prediction quality using separate dimensions such as:

- prior dating
- textual stability
- explicitness
- specificity
- clarity
- falsifiability
- time constraint
- subject identification
- uniqueness or improbability
- original-context fit
- evidence that the interpretation predates the alleged fulfillment
- resistance to retrospective reinterpretation

## Fulfillment-quality dimensions

Evaluate alleged fulfillment separately using dimensions such as:

- independent attestation
- source proximity
- source reliability
- multiple attestation
- external corroboration
- correspondence with the actual prediction
- completeness
- resistance to deliberate staging
- resistance to narrative construction
- absence of material contradiction
- historical consensus or dispute level

## Resolution-quality dimensions

Evaluate proposed resolutions separately using dimensions such as:

- directly addresses the objection
- preserves the original wording and context
- avoids special pleading
- avoids introducing unverifiable assumptions
- internal consistency
- consistency with other resolutions
- parsimony
- falsifiability
- acceptance outside explicitly apologetic sources

## Rating requirements

Each formal rating must store:

- dimension
- numeric score
- descriptive label
- written rationale
- supporting citations
- reviewer
- reviewer perspective
- reviewer confidence
- status: draft, submitted, approved, superseded, rejected
- created and updated timestamps

An optional computed summary may be displayed, but it must never replace the component scores and must disclose its formula.

Editorial and community scores must never be combined into one opaque number.

## Categories

Initial controlled categories should include:

- predictive prophecy
- conditional prophecy
- apocalyptic prophecy
- messianic prophecy
- typology
- foreshadowing
- retrospective interpretation
- oracle
- vision
- dream
- divine promise
- divine threat
- sign prophecy
- self-fulfilling prophecy
- post-event prophecy
- failed prophecy
- deferred prophecy
- spiritualized fulfillment
- partial fulfillment
- dual fulfillment
- future fulfillment
- historical fulfillment
- symbolic fulfillment

Initial subject categories should include:

- person
- dynasty
- nation
- city
- temple
- war
- empire
- natural event
- cosmic event
- religious movement
- moral condition
- end times
- afterlife
- miracle
- personal destiny

These should be seeded data, not hard-coded TypeScript unions unless the repository’s established pattern strongly favors enums. Prefer editable controlled vocabularies where future expansion is expected.

## Search and filtering

The public and administrative interfaces must eventually support:

- full-text search
- passage reference
- source-list name and entry number
- tradition
- corpus and document
- historical period
- claim type
- evidentiary direction
- category and tag
- person, place, and event
- interpretation method
- reviewer and reviewer perspective
- prediction-quality dimensions
- fulfillment-quality dimensions
- resolution-quality dimensions
- independent corroboration
- unresolved objections
- duplicate group
- publication and moderation status

Start with PostgreSQL-backed search using the existing stack. Do not add OpenSearch or another service for the MVP.

Consider PostgreSQL `pg_trgm` and full-text indexes only after checking current database extension and migration conventions.

## Admin-first MVP

The first usable milestone is an editorial system, not a polished public encyclopedia.

Required MVP capabilities:

1. Authentication and role checks using the existing AA user system.
2. Create and edit traditions, corpora, documents, passages, and sources.
3. Create source lists and import source-list entries.
4. Create normalized claims.
5. Map source-list entries to normalized claims.
6. Create interpretations and alleged fulfillments.
7. Attach supporting and opposing evidence.
8. Create objections and proposed resolutions.
9. Add dimensional evaluations with rationales and citations.
10. Tag and categorize records.
11. Create claim relationships.
12. Search and filter administrative records.
13. Merge duplicate claims without losing source-entry provenance.
14. Maintain revision history and approval status.
15. Export normalized data as JSON and CSV.

## Import system

The importer is a core feature.

Support CSV and JSON initially. Preserve imported content exactly before normalization.

Each import should record:

- source list
- import batch
- original row or object
- original entry number
- original wording
- original references
- parsing status
- validation errors
- mapping status
- mapped claim or claims
- mapping rationale
- mapping confidence
- reviewer or contributor responsible

Importing must be idempotent where practical. Re-importing the same source should not silently duplicate entries.

Do not begin by manually hard-coding 324 records into seed files. Build the import and normalization workflow first, then use it to ingest the first dataset.

## Suggested workflow states

Canonical and submitted content should use explicit moderation states such as:

- draft
- submitted
- needs_changes
- approved
- published
- rejected
- archived
- superseded

Use the existing application’s state patterns where available.

## Roles and permissions

Reuse the existing AA account and authorization system.

Required capabilities conceptually include:

### Anonymous

- read published content
- browse and search public records

### Registered user

- bookmark claims, if the existing account model makes this low cost
- submit corrections or suggestions
- draft community reviews if enabled

### Contributor

- create draft records
- edit their own drafts
- submit changes for review

### Reviewer

- publish or approve evaluations within assigned scope
- request changes

### Administrator

- approve canonical content
- merge duplicates
- manage controlled vocabularies
- manage imports
- manage users and roles
- archive or supersede records

Do not create duplicate role infrastructure if the current code already has an equivalent permission model.

## Citation model

Citations must be reusable and attributable.

Support at least:

- books
- book chapters
- journal articles
- academic papers
- websites
- ancient primary texts
- manuscripts
- inscriptions
- archaeological reports
- videos and lectures
- reference works

Store structured bibliographic fields where reasonable, plus a rendered citation and URL when applicable.

Allow citations to attach to specific assertions, not merely to an entire page.

Respect copyright. Store short quotations and references, not complete copyrighted translations or books.

## Public claim page

After the admin workflow is stable, build a public claim page that clearly separates:

1. Neutral normalized claim.
2. Original passages and textual variants.
3. Source lists that include the claim.
4. Interpretations.
5. Alleged fulfillments.
6. Supporting evidence.
7. Opposing evidence.
8. Objections.
9. Proposed resolutions.
10. Dimensional evaluations.
11. Reviewer perspectives.
12. Related and duplicate claims.
13. Revision and citation metadata.

The page must make internal versus external evidence visible without treating that label as a verdict.

## Initial dataset target

The first dataset should be one clearly identified version of the commonly circulated “324 prophecies fulfilled by Jesus” list.

Do not assume all versions of that list contain the same entries or numbering.

Record the exact source and preserve its wording. The initial editorial project is to determine:

- how many source entries exist
- how many distinct passages are cited
- how many normalized unique claims remain after deduplication
- how many are direct predictions
- how many are typological or retrospective readings
- how many are specific and falsifiable
- how many alleged fulfillments rely only on internal sources
- how many have meaningful independent evidence
- how many are duplicated or split into multiple entries
- how many remain unresolved or indeterminate

Do not publish illustrative counts as actual findings. Counts must be generated from reviewed data.

## Deferred AI features

Do not include these in the initial MVP unless the core workflow is already complete and tested:

- semantic duplicate detection
- automatic claim normalization
- automatic tagging
- interpretation classification
- citation suggestions
- draft evaluations
- natural-language search
- consistency checking
- automated objection and resolution generation

Design service boundaries so these can be added later using the project’s existing provider abstraction.

Any AI output must remain a draft requiring human review and must record model, prompt version, generation time, and reviewer disposition.

## Testing expectations

Follow the repository’s existing testing tools and conventions.

At minimum, add tests for:

- role and permission enforcement
- claim creation and moderation transitions
- duplicate merging without provenance loss
- import idempotency
- source-entry-to-claim mappings
- rating validation
- citation requirements
- search filters
- public visibility rules
- JSON and CSV export
- migration integrity

Run the existing lint, typecheck, test, Prisma validation, and production build commands before considering a phase complete.

## Deployment constraints

Use the existing deployment pipeline.

Expected deployment remains conceptually:

```bash
git fetch
git reset --hard origin/main
npm ci
npm run db:deploy
npm run build
restart artificial-atheist
```

Any schema changes must be delivered through normal Prisma migrations and must not wipe existing quiz, chat, credit, pipeline, account, or publication data.

Avoid adding new system services. Any unavoidable server-level requirement must be documented as a small, explicit SSH handoff for the owner.

The owner is not expected to write or integrate code. Manual involvement should be limited to operations that require SSH, root privileges, DNS, secrets, or environment-specific confirmation.

## Documentation deliverables

Create or update documentation covering:

- integration architecture
- domain model and ERD
- Prisma models and migration notes
- role and moderation workflow
- import file format
- citation format
- rating methodology
- local development
- deployment impact
- admin usage
- contributor usage
- data export
- rollback procedure

## Implementation phases

### Phase 0: repository audit

Produce the integration plan and identify conflicts or reusable systems.

### Phase 1: domain schema

Add Prisma models, migrations, controlled vocabulary seeds, and domain tests.

### Phase 2: admin workflow

Build source, source-list, import, claim, interpretation, fulfillment, evidence, objection, resolution, relationship, and evaluation interfaces.

### Phase 3: first dataset

Import one identified 324-claim source list, preserve every entry, and begin normalization without inventing findings.

### Phase 4: public browsing

Add public index, claim pages, filters, and cross-references using the existing AA design system.

### Phase 5: editorial analysis

Complete deduplication, ratings, objections, resolutions, and dataset summaries.

### Phase 6: optional AI assistance

Add reviewed drafting and similarity tools only after the manual workflow is reliable.

## Definition of done for the first milestone

The first milestone is complete when an authorized editor can:

1. Import a prophecy list.
2. Preserve every original entry.
3. Normalize entries into unique claims.
4. Attach passages, interpretations, fulfillments, evidence, objections, and resolutions.
5. Rate prediction quality and fulfillment quality separately with citations.
6. Mark evidence as internal, external, mixed, or not testable.
7. Merge duplicate claims without losing provenance.
8. Search and filter the dataset.
9. Export the data.
10. Publish approved records through the existing Artificial Atheist application.

The implementation must look and operate like part of Artificial Atheist, not like an embedded second product.