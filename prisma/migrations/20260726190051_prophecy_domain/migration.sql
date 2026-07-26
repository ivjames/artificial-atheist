-- CreateTable
CREATE TABLE "ProphecyTradition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyTradition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyCorpus" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "traditionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyCorpus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyDocument" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corpusId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyPassage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "chapterStart" INTEGER,
    "verseStart" INTEGER,
    "chapterEnd" INTEGER,
    "verseEnd" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyPassage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyQuotation" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecySource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "publisher" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "citation" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecySourceList" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "claimedCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecySourceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyImportBatch" (
    "id" TEXT NOT NULL,
    "sourceListId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filename" TEXT NOT NULL DEFAULT '',
    "importedBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecySourceListEntry" (
    "id" TEXT NOT NULL,
    "sourceListId" TEXT NOT NULL,
    "batchId" TEXT,
    "entryNumber" TEXT NOT NULL,
    "originalWording" TEXT NOT NULL,
    "originalPassageRefs" TEXT NOT NULL DEFAULT '',
    "originalFulfillmentRefs" TEXT NOT NULL DEFAULT '',
    "originalRaw" TEXT NOT NULL DEFAULT '',
    "parseStatus" TEXT NOT NULL DEFAULT 'ok',
    "parseErrors" TEXT NOT NULL DEFAULT '',
    "mappingStatus" TEXT NOT NULL DEFAULT 'unmapped',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecySourceListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyClaim" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "categoryKeys" TEXT NOT NULL DEFAULT '[]',
    "subjectKeys" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyClaimEntryMap" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyClaimEntryMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyClaimPassage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'primary',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyClaimPassage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyInterpretation" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "passageId" TEXT,
    "traditionId" TEXT,
    "perspective" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalContext" TEXT NOT NULL DEFAULT '',
    "predatesFulfillment" TEXT NOT NULL DEFAULT 'unknown',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyInterpretation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyFulfillment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "interpretationId" TEXT,
    "eventId" TEXT,
    "personId" TEXT,
    "description" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'internal',
    "directionRationale" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyEvidence" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "sourceId" TEXT,
    "dateRange" TEXT NOT NULL DEFAULT '',
    "independence" TEXT NOT NULL DEFAULT 'unknown',
    "directness" TEXT NOT NULL DEFAULT '',
    "reliabilityNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyObjection" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "raisedBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyObjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyResolution" (
    "id" TEXT NOT NULL,
    "objectionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyReviewer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "perspective" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyEvaluation" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProphecyEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyCitation" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "locator" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyPerson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyPlace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dateRange" TEXT NOT NULL DEFAULT '',
    "placeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyRelationship" (
    "id" TEXT NOT NULL,
    "fromType" TEXT NOT NULL DEFAULT 'claim',
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL DEFAULT 'claim',
    "toId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyVocabTerm" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProphecyVocabTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProphecyRevision" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "editor" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProphecyRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyTradition_key_key" ON "ProphecyTradition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyCorpus_slug_key" ON "ProphecyCorpus"("slug");

-- CreateIndex
CREATE INDEX "ProphecyCorpus_traditionId_idx" ON "ProphecyCorpus"("traditionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyDocument_slug_key" ON "ProphecyDocument"("slug");

-- CreateIndex
CREATE INDEX "ProphecyDocument_corpusId_idx" ON "ProphecyDocument"("corpusId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyPassage_documentId_ref_key" ON "ProphecyPassage"("documentId", "ref");

-- CreateIndex
CREATE INDEX "ProphecyQuotation_passageId_idx" ON "ProphecyQuotation"("passageId");

-- CreateIndex
CREATE INDEX "ProphecyQuotation_sourceId_idx" ON "ProphecyQuotation"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecySource_slug_key" ON "ProphecySource"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecySourceList_slug_key" ON "ProphecySourceList"("slug");

-- CreateIndex
CREATE INDEX "ProphecySourceList_sourceId_idx" ON "ProphecySourceList"("sourceId");

-- CreateIndex
CREATE INDEX "ProphecyImportBatch_sourceListId_idx" ON "ProphecyImportBatch"("sourceListId");

-- CreateIndex
CREATE INDEX "ProphecyImportBatch_status_idx" ON "ProphecyImportBatch"("status");

-- CreateIndex
CREATE INDEX "ProphecySourceListEntry_batchId_idx" ON "ProphecySourceListEntry"("batchId");

-- CreateIndex
CREATE INDEX "ProphecySourceListEntry_mappingStatus_idx" ON "ProphecySourceListEntry"("mappingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecySourceListEntry_sourceListId_entryNumber_key" ON "ProphecySourceListEntry"("sourceListId", "entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyClaim_slug_key" ON "ProphecyClaim"("slug");

-- CreateIndex
CREATE INDEX "ProphecyClaim_status_idx" ON "ProphecyClaim"("status");

-- CreateIndex
CREATE INDEX "ProphecyClaim_supersededById_idx" ON "ProphecyClaim"("supersededById");

-- CreateIndex
CREATE INDEX "ProphecyClaimEntryMap_entryId_idx" ON "ProphecyClaimEntryMap"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyClaimEntryMap_claimId_entryId_key" ON "ProphecyClaimEntryMap"("claimId", "entryId");

-- CreateIndex
CREATE INDEX "ProphecyClaimPassage_passageId_idx" ON "ProphecyClaimPassage"("passageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyClaimPassage_claimId_passageId_key" ON "ProphecyClaimPassage"("claimId", "passageId");

-- CreateIndex
CREATE INDEX "ProphecyInterpretation_claimId_idx" ON "ProphecyInterpretation"("claimId");

-- CreateIndex
CREATE INDEX "ProphecyInterpretation_passageId_idx" ON "ProphecyInterpretation"("passageId");

-- CreateIndex
CREATE INDEX "ProphecyInterpretation_traditionId_idx" ON "ProphecyInterpretation"("traditionId");

-- CreateIndex
CREATE INDEX "ProphecyInterpretation_status_idx" ON "ProphecyInterpretation"("status");

-- CreateIndex
CREATE INDEX "ProphecyFulfillment_claimId_idx" ON "ProphecyFulfillment"("claimId");

-- CreateIndex
CREATE INDEX "ProphecyFulfillment_interpretationId_idx" ON "ProphecyFulfillment"("interpretationId");

-- CreateIndex
CREATE INDEX "ProphecyFulfillment_eventId_idx" ON "ProphecyFulfillment"("eventId");

-- CreateIndex
CREATE INDEX "ProphecyFulfillment_personId_idx" ON "ProphecyFulfillment"("personId");

-- CreateIndex
CREATE INDEX "ProphecyFulfillment_status_idx" ON "ProphecyFulfillment"("status");

-- CreateIndex
CREATE INDEX "ProphecyEvidence_targetType_targetId_idx" ON "ProphecyEvidence"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ProphecyEvidence_sourceId_idx" ON "ProphecyEvidence"("sourceId");

-- CreateIndex
CREATE INDEX "ProphecyEvidence_status_idx" ON "ProphecyEvidence"("status");

-- CreateIndex
CREATE INDEX "ProphecyObjection_targetType_targetId_idx" ON "ProphecyObjection"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ProphecyObjection_status_idx" ON "ProphecyObjection"("status");

-- CreateIndex
CREATE INDEX "ProphecyResolution_objectionId_idx" ON "ProphecyResolution"("objectionId");

-- CreateIndex
CREATE INDEX "ProphecyResolution_status_idx" ON "ProphecyResolution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyReviewer_slug_key" ON "ProphecyReviewer"("slug");

-- CreateIndex
CREATE INDEX "ProphecyEvaluation_targetType_targetId_idx" ON "ProphecyEvaluation"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ProphecyEvaluation_reviewerId_idx" ON "ProphecyEvaluation"("reviewerId");

-- CreateIndex
CREATE INDEX "ProphecyEvaluation_status_idx" ON "ProphecyEvaluation"("status");

-- CreateIndex
CREATE INDEX "ProphecyCitation_targetType_targetId_idx" ON "ProphecyCitation"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ProphecyCitation_sourceId_idx" ON "ProphecyCitation"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyPerson_slug_key" ON "ProphecyPerson"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyPlace_slug_key" ON "ProphecyPlace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyEvent_slug_key" ON "ProphecyEvent"("slug");

-- CreateIndex
CREATE INDEX "ProphecyEvent_placeId_idx" ON "ProphecyEvent"("placeId");

-- CreateIndex
CREATE INDEX "ProphecyRelationship_toType_toId_idx" ON "ProphecyRelationship"("toType", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyRelationship_fromType_fromId_toType_toId_type_key" ON "ProphecyRelationship"("fromType", "fromId", "toType", "toId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProphecyVocabTerm_kind_key_key" ON "ProphecyVocabTerm"("kind", "key");

-- CreateIndex
CREATE INDEX "ProphecyRevision_targetType_targetId_idx" ON "ProphecyRevision"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "ProphecyCorpus" ADD CONSTRAINT "ProphecyCorpus_traditionId_fkey" FOREIGN KEY ("traditionId") REFERENCES "ProphecyTradition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyDocument" ADD CONSTRAINT "ProphecyDocument_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "ProphecyCorpus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyPassage" ADD CONSTRAINT "ProphecyPassage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProphecyDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyQuotation" ADD CONSTRAINT "ProphecyQuotation_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "ProphecyPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyQuotation" ADD CONSTRAINT "ProphecyQuotation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProphecySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecySourceList" ADD CONSTRAINT "ProphecySourceList_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProphecySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyImportBatch" ADD CONSTRAINT "ProphecyImportBatch_sourceListId_fkey" FOREIGN KEY ("sourceListId") REFERENCES "ProphecySourceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecySourceListEntry" ADD CONSTRAINT "ProphecySourceListEntry_sourceListId_fkey" FOREIGN KEY ("sourceListId") REFERENCES "ProphecySourceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecySourceListEntry" ADD CONSTRAINT "ProphecySourceListEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProphecyImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyClaim" ADD CONSTRAINT "ProphecyClaim_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ProphecyClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyClaimEntryMap" ADD CONSTRAINT "ProphecyClaimEntryMap_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProphecyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyClaimEntryMap" ADD CONSTRAINT "ProphecyClaimEntryMap_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ProphecySourceListEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyClaimPassage" ADD CONSTRAINT "ProphecyClaimPassage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProphecyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyClaimPassage" ADD CONSTRAINT "ProphecyClaimPassage_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "ProphecyPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyInterpretation" ADD CONSTRAINT "ProphecyInterpretation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProphecyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyInterpretation" ADD CONSTRAINT "ProphecyInterpretation_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "ProphecyPassage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyInterpretation" ADD CONSTRAINT "ProphecyInterpretation_traditionId_fkey" FOREIGN KEY ("traditionId") REFERENCES "ProphecyTradition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyFulfillment" ADD CONSTRAINT "ProphecyFulfillment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ProphecyClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyFulfillment" ADD CONSTRAINT "ProphecyFulfillment_interpretationId_fkey" FOREIGN KEY ("interpretationId") REFERENCES "ProphecyInterpretation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyFulfillment" ADD CONSTRAINT "ProphecyFulfillment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ProphecyEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyFulfillment" ADD CONSTRAINT "ProphecyFulfillment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ProphecyPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyEvidence" ADD CONSTRAINT "ProphecyEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProphecySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyResolution" ADD CONSTRAINT "ProphecyResolution_objectionId_fkey" FOREIGN KEY ("objectionId") REFERENCES "ProphecyObjection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyEvaluation" ADD CONSTRAINT "ProphecyEvaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "ProphecyReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyCitation" ADD CONSTRAINT "ProphecyCitation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProphecySource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProphecyEvent" ADD CONSTRAINT "ProphecyEvent_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "ProphecyPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
