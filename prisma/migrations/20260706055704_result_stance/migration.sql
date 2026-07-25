-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "belief" TEXT,
ADD COLUMN     "knowledge" TEXT;

-- CreateIndex
CREATE INDEX "Result_belief_knowledge_idx" ON "Result"("belief", "knowledge");
