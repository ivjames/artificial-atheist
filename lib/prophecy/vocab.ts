// Prophecy module controlled vocabulary — the raw seed data, kept as pure
// data (no Prisma import) so it can be unit-tested and reused by the app
// layer for validation. Seeded into ProphecyVocabTerm by
// prisma/seed-prophecy.ts (idempotent upserts). Terms come from
// PROPHECY-HANDOFF.md; keys are stable snake_case identifiers — edit labels
// and descriptions freely, never repurpose a key.

export type ProphecyVocabTermData = {
  kind: string;
  key: string;
  label: string;
  description: string;
};

type Term = { key: string; label: string; description: string };

// Shared moderation states for canonical/submitted content (handoff:
// "Suggested workflow states"). Order = lifecycle order.
export const MODERATION_STATES = [
  "draft",
  "submitted",
  "needs_changes",
  "approved",
  "published",
  "rejected",
  "archived",
  "superseded",
] as const;

// Evidentiary direction for claims/fulfillments (handoff: "Evidentiary
// direction"). A classification with a stored rationale — never a verdict:
// internal does not mean false, external does not mean true.
export const EVIDENTIARY_DIRECTIONS = [
  "internal", // established primarily through sources inside the same tradition
  "external", // substantially evaluable through tradition-independent evidence
  "mixed", // both internal and external evidence in the record
  "not_testable", // no practical external test or clear failure condition
] as const;

// Score labels for the fixed 0–5 rating scale (index = numeric score).
export const SCORE_LABELS = [
  "absent", // 0
  "very_weak", // 1
  "weak", // 2
  "mixed", // 3
  "strong", // 4
  "very_strong", // 5
] as const;

// Entry→claim mapping match types (ProphecyClaimEntryMap.matchType).
export const MATCH_TYPES = [
  "exact",
  "partial",
  "compound",
  "duplicate",
  "near_duplicate",
  "disputed",
] as const;

// --- vocab terms per kind -------------------------------------------------

// 23 claim categories (handoff: "Categories").
const CATEGORIES: Term[] = [
  { key: "predictive_prophecy", label: "Predictive prophecy", description: "A forward-looking prediction of a future state of affairs." },
  { key: "conditional_prophecy", label: "Conditional prophecy", description: "An outcome contingent on behavior — 'if X, then Y'." },
  { key: "apocalyptic_prophecy", label: "Apocalyptic prophecy", description: "Cosmic upheaval, judgment, or end-of-age imagery." },
  { key: "messianic_prophecy", label: "Messianic prophecy", description: "Read as concerning a promised deliverer or anointed figure." },
  { key: "typology", label: "Typology", description: "An earlier person/event/institution treated as a pattern prefiguring a later one." },
  { key: "foreshadowing", label: "Foreshadowing", description: "A text presented as anticipating a later development without an explicit prediction." },
  { key: "retrospective_interpretation", label: "Retrospective interpretation", description: "A predictive reading documented only after the alleged fulfillment." },
  { key: "oracle", label: "Oracle", description: "A pronouncement delivered through a prophetic or mantic figure." },
  { key: "vision", label: "Vision", description: "Content framed as a visionary experience." },
  { key: "dream", label: "Dream", description: "Content framed as a dream or dream interpretation." },
  { key: "divine_promise", label: "Divine promise", description: "A commitment attributed to a deity, typically of blessing or favor." },
  { key: "divine_threat", label: "Divine threat", description: "A warning of judgment or punishment attributed to a deity." },
  { key: "sign_prophecy", label: "Sign prophecy", description: "A nearer-term sign offered to authenticate a speaker or a larger claim." },
  { key: "self_fulfilling_prophecy", label: "Self-fulfilling prophecy", description: "An outcome plausibly caused by knowledge of the prediction itself." },
  { key: "post_event_prophecy", label: "Post-event prophecy", description: "A 'prediction' plausibly written after the event it describes (vaticinium ex eventu)." },
  { key: "failed_prophecy", label: "Failed prophecy", description: "A prediction whose stated outcome did not occur as specified." },
  { key: "deferred_prophecy", label: "Deferred prophecy", description: "A fulfillment reassigned to an indefinite or still-future time after non-occurrence." },
  { key: "spiritualized_fulfillment", label: "Spiritualized fulfillment", description: "A concrete prediction read as fulfilled in a spiritual or non-literal sense." },
  { key: "partial_fulfillment", label: "Partial fulfillment", description: "Only some elements of the prediction are claimed to have occurred." },
  { key: "dual_fulfillment", label: "Dual fulfillment", description: "Claimed to be fulfilled more than once — a near-term and a later referent." },
  { key: "future_fulfillment", label: "Future fulfillment", description: "Fulfillment asserted to lie in the future, beyond present evaluation." },
  { key: "historical_fulfillment", label: "Historical fulfillment", description: "Fulfillment located in a specific identifiable historical event." },
  { key: "symbolic_fulfillment", label: "Symbolic fulfillment", description: "Fulfillment claimed through symbolic or figurative correspondence." },
];

// 15 subject categories (handoff: "Categories").
const SUBJECTS: Term[] = [
  { key: "person", label: "Person", description: "Concerns a specific individual." },
  { key: "dynasty", label: "Dynasty", description: "Concerns a ruling line or house." },
  { key: "nation", label: "Nation", description: "Concerns a people or nation." },
  { key: "city", label: "City", description: "Concerns a specific city." },
  { key: "temple", label: "Temple", description: "Concerns a temple or sanctuary." },
  { key: "war", label: "War", description: "Concerns a war, siege, or battle." },
  { key: "empire", label: "Empire", description: "Concerns an empire or imperial power." },
  { key: "natural_event", label: "Natural event", description: "Concerns an earthquake, famine, plague, or other natural occurrence." },
  { key: "cosmic_event", label: "Cosmic event", description: "Concerns celestial or cosmic phenomena." },
  { key: "religious_movement", label: "Religious movement", description: "Concerns the rise, spread, or fate of a religious movement." },
  { key: "moral_condition", label: "Moral condition", description: "Concerns the moral or spiritual state of a people or era." },
  { key: "end_times", label: "End times", description: "Concerns the end of the age or of the world." },
  { key: "afterlife", label: "Afterlife", description: "Concerns post-mortem states or destinations." },
  { key: "miracle", label: "Miracle", description: "Concerns a miraculous act or sign." },
  { key: "personal_destiny", label: "Personal destiny", description: "Concerns the fate or life course of an individual." },
];

// 9 interpretive methods (handoff: "Interpretation"). Keys mirror
// ProphecyInterpretation.method.
const INTERPRETATION_METHODS: Term[] = [
  { key: "direct_prediction", label: "Direct prediction", description: "Read as a straightforward forecast of a specific future outcome." },
  { key: "messianic", label: "Messianic interpretation", description: "Read as referring to a promised messianic figure." },
  { key: "historical_context", label: "Historical-context reading", description: "Read against its original historical setting and audience." },
  { key: "typology", label: "Typology", description: "An earlier type read as prefiguring a later antitype." },
  { key: "allegory", label: "Allegory", description: "Read as extended figurative correspondence rather than literal prediction." },
  { key: "dual_fulfillment", label: "Dual fulfillment", description: "Read as having both a near-term and a later fulfillment." },
  { key: "sensus_plenior", label: "Sensus plenior", description: "A 'fuller sense' attributed to the text beyond the human author's intent." },
  { key: "retrospective", label: "Retrospective reinterpretation", description: "A predictive sense assigned only after the alleged fulfillment." },
  { key: "post_event", label: "Post-event prophecy", description: "The 'prediction' is dated at or after the event it describes." },
];

// 14 relationship types (handoff: "Relationship"). Keys mirror
// ProphecyRelationship.type.
const RELATIONSHIP_TERMS: Term[] = [
  { key: "duplicate_of", label: "Duplicate of", description: "Same claim as the target; merge candidates confirmed." },
  { key: "potential_duplicate_of", label: "Potential duplicate of", description: "Suspected duplicate of the target, pending review." },
  { key: "derived_from", label: "Derived from", description: "Textually or conceptually derived from the target." },
  { key: "depends_on", label: "Depends on", description: "Only holds if the target holds." },
  { key: "contradicts", label: "Contradicts", description: "Materially inconsistent with the target." },
  { key: "supports", label: "Supports", description: "Strengthens or corroborates the target." },
  { key: "responds_to", label: "Responds to", description: "A reply or counter to the target." },
  { key: "reinterprets", label: "Reinterprets", description: "Reads the target in a new interpretive frame." },
  { key: "shares_passage_with", label: "Shares passage with", description: "Cites the same underlying passage as the target." },
  { key: "shares_fulfillment_with", label: "Shares fulfillment with", description: "Points to the same alleged fulfillment as the target." },
  { key: "part_of_composite_claim", label: "Part of composite claim", description: "One component of a larger compound claim." },
  { key: "allegedly_fulfilled_by", label: "Allegedly fulfilled by", description: "The target is asserted to fulfill this claim." },
  { key: "quoted_by", label: "Quoted by", description: "The target quotes this text." },
  { key: "alludes_to", label: "Alludes to", description: "Echoes the target without quoting it." },
];

// 12 prediction-quality dimensions (handoff: "Prediction-quality dimensions").
const PREDICTION_DIMENSIONS: Term[] = [
  { key: "prior_dating", label: "Prior dating", description: "The prediction is demonstrably dated before the alleged fulfillment." },
  { key: "textual_stability", label: "Textual stability", description: "The wording is stable across manuscripts and textual traditions." },
  { key: "explicitness", label: "Explicitness", description: "The text explicitly predicts rather than requiring an inferred prediction." },
  { key: "specificity", label: "Specificity", description: "Names concrete details — who, what, where, when — rather than generalities." },
  { key: "clarity", label: "Clarity", description: "The meaning is plain without heavy interpretive machinery." },
  { key: "falsifiability", label: "Falsifiability", description: "A clear state of affairs would count as the prediction failing." },
  { key: "time_constraint", label: "Time constraint", description: "Specifies a timeframe within which fulfillment must occur." },
  { key: "subject_identification", label: "Subject identification", description: "The subject of the prediction is identifiable from the text itself." },
  { key: "uniqueness", label: "Uniqueness / improbability", description: "The predicted outcome is improbable rather than a safe or common occurrence." },
  { key: "original_context_fit", label: "Original-context fit", description: "The predictive reading fits the passage's original historical context." },
  { key: "interpretation_predates", label: "Interpretation predates fulfillment", description: "The predictive interpretation is documented before the alleged fulfillment." },
  { key: "retrospective_resistance", label: "Resistance to retrospective reinterpretation", description: "The reading is not easily manufactured after the fact." },
];

// 11 fulfillment-quality dimensions (handoff: "Fulfillment-quality dimensions").
const FULFILLMENT_DIMENSIONS: Term[] = [
  { key: "independent_attestation", label: "Independent attestation", description: "The fulfillment is attested outside the originating tradition." },
  { key: "source_proximity", label: "Source proximity", description: "Sources are close in time and place to the alleged fulfillment." },
  { key: "source_reliability", label: "Source reliability", description: "The attesting sources have a credible track record and transmission." },
  { key: "multiple_attestation", label: "Multiple attestation", description: "Several independent sources report the fulfillment." },
  { key: "external_corroboration", label: "External corroboration", description: "Physical, documentary, or archaeological evidence corroborates the event." },
  { key: "prediction_correspondence", label: "Correspondence with the prediction", description: "The event matches what was actually predicted, not a looser paraphrase." },
  { key: "completeness", label: "Completeness", description: "All elements of the prediction are fulfilled, not a selected subset." },
  { key: "staging_resistance", label: "Resistance to deliberate staging", description: "The event could not plausibly have been arranged to match the prediction." },
  { key: "narrative_resistance", label: "Resistance to narrative construction", description: "The fulfillment account is unlikely to have been written to fit the prophecy." },
  { key: "contradiction_absence", label: "Absence of material contradiction", description: "No credible evidence materially contradicts the fulfillment account." },
  { key: "consensus_level", label: "Historical consensus level", description: "Degree of scholarly consensus versus dispute about the event." },
];

// 9 resolution-quality dimensions (handoff: "Resolution-quality dimensions").
const RESOLUTION_DIMENSIONS: Term[] = [
  { key: "addresses_objection", label: "Directly addresses the objection", description: "Engages the actual objection rather than a weaker substitute." },
  { key: "preserves_context", label: "Preserves wording and context", description: "Keeps the original wording and historical context intact." },
  { key: "avoids_special_pleading", label: "Avoids special pleading", description: "Applies standards that would be accepted for rival claims too." },
  { key: "avoids_unverifiable", label: "Avoids unverifiable assumptions", description: "Does not introduce assumptions that cannot be checked." },
  { key: "internal_consistency", label: "Internal consistency", description: "Coherent on its own terms, without self-contradiction." },
  { key: "cross_resolution_consistency", label: "Consistency with other resolutions", description: "Compatible with resolutions offered for related objections." },
  { key: "parsimony", label: "Parsimony", description: "Explains the objection with the fewest additional commitments." },
  { key: "falsifiability", label: "Falsifiability", description: "Some state of affairs would count against the resolution." },
  { key: "external_acceptance", label: "Acceptance outside apologetic sources", description: "Accepted by scholarship outside explicitly apologetic literature." },
];

// 11 source types (handoff: "Citation model"). Keys mirror
// ProphecySource.type.
const SOURCE_TYPES: Term[] = [
  { key: "book", label: "Book", description: "A published book." },
  { key: "book_chapter", label: "Book chapter", description: "A chapter within an edited volume." },
  { key: "journal_article", label: "Journal article", description: "A peer-reviewed journal article." },
  { key: "academic_paper", label: "Academic paper", description: "A working paper, thesis, or conference paper." },
  { key: "website", label: "Website", description: "A web page or online publication." },
  { key: "primary_text", label: "Primary text", description: "An ancient primary text or edition thereof." },
  { key: "manuscript", label: "Manuscript", description: "A specific manuscript witness." },
  { key: "inscription", label: "Inscription", description: "An epigraphic source." },
  { key: "archaeological_report", label: "Archaeological report", description: "A published excavation or survey report." },
  { key: "video", label: "Video / lecture", description: "A recorded video or lecture." },
  { key: "reference_work", label: "Reference work", description: "A dictionary, encyclopedia, or similar reference work." },
];

// 9 evidence types (ProphecyEvidence.evidenceType).
const EVIDENCE_TYPES: Term[] = [
  { key: "textual", label: "Textual", description: "Manuscript or literary-textual evidence." },
  { key: "archaeological", label: "Archaeological", description: "Material remains, excavation findings." },
  { key: "historical_record", label: "Historical record", description: "Chronicles, annals, administrative or narrative records." },
  { key: "astronomical", label: "Astronomical", description: "Datable celestial phenomena." },
  { key: "numismatic", label: "Numismatic", description: "Coin evidence." },
  { key: "epigraphic", label: "Epigraphic", description: "Inscriptions." },
  { key: "scholarly_analysis", label: "Scholarly analysis", description: "Secondary scholarship analyzing the primary evidence." },
  { key: "tradition_internal", label: "Tradition-internal", description: "Evidence originating inside the same religious tradition." },
  { key: "other", label: "Other", description: "Evidence not covered by the other types." },
];

// Relationship-type keys as a flat constant (validation convenience; same
// data as the relationship_type vocab terms).
export const RELATIONSHIP_TYPES = RELATIONSHIP_TERMS.map((t) => t.key);

function withKind(kind: string, terms: Term[]): ProphecyVocabTermData[] {
  return terms.map((t) => ({ kind, ...t }));
}

// Every seeded vocab term, grouped by kind in seed order. sortOrder in the DB
// is the position within each kind (assigned by the seeder).
export const PROPHECY_VOCAB: ProphecyVocabTermData[] = [
  ...withKind("category", CATEGORIES),
  ...withKind("subject", SUBJECTS),
  ...withKind("interpretation_method", INTERPRETATION_METHODS),
  ...withKind("relationship_type", RELATIONSHIP_TERMS),
  ...withKind("evidence_type", EVIDENCE_TYPES),
  ...withKind("prediction_dimension", PREDICTION_DIMENSIONS),
  ...withKind("fulfillment_dimension", FULFILLMENT_DIMENSIONS),
  ...withKind("resolution_dimension", RESOLUTION_DIMENSIONS),
  ...withKind("source_type", SOURCE_TYPES),
];
