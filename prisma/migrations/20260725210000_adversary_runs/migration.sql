-- CreateTable
CREATE TABLE "AdversaryRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "persona" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "adversaryModel" TEXT NOT NULL,
    "sophistication" INTEGER NOT NULL,
    "verbosity" TEXT NOT NULL,
    "hostility" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "turns" INTEGER NOT NULL,
    "seed" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "runStamp" TEXT NOT NULL,

    CONSTRAINT "AdversaryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdversaryRun_persona_idx" ON "AdversaryRun"("persona");

-- CreateIndex
CREATE INDEX "AdversaryRun_createdAt_idx" ON "AdversaryRun"("createdAt");

-- CreateIndex
CREATE INDEX "AdversaryRun_runStamp_idx" ON "AdversaryRun"("runStamp");
