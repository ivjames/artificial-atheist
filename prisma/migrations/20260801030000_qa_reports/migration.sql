-- CreateTable
CREATE TABLE "QaReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3),
    "pages" INTEGER NOT NULL DEFAULT 0,
    "serious" INTEGER NOT NULL DEFAULT 0,
    "moderate" INTEGER NOT NULL DEFAULT 0,
    "minor" INTEGER NOT NULL DEFAULT 0,
    "info" INTEGER NOT NULL DEFAULT 0,
    "findings" TEXT NOT NULL,
    "stats" TEXT NOT NULL,

    CONSTRAINT "QaReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QaReport_runId_key" ON "QaReport"("runId");

-- CreateIndex
CREATE INDEX "QaReport_createdAt_idx" ON "QaReport"("createdAt");

-- CreateIndex
CREATE INDEX "QaReport_target_idx" ON "QaReport"("target");
