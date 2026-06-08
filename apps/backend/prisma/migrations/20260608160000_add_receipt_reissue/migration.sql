-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "supersedesId" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "documents_supersedesId_idx" ON "documents"("supersedesId");
