/*
  Warnings:

  - You are about to drop the column `belief` on the `Result` table. All the data in the column will be lost.
  - You are about to drop the column `knowledge` on the `Result` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Result_belief_knowledge_idx";

-- AlterTable
ALTER TABLE "Result" DROP COLUMN "belief",
DROP COLUMN "knowledge",
ADD COLUMN     "agnostic" BOOLEAN,
ADD COLUMN     "atheist" BOOLEAN;

-- CreateIndex
CREATE INDEX "Result_atheist_agnostic_idx" ON "Result"("atheist", "agnostic");
