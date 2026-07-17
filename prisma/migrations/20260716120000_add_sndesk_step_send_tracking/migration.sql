ALTER TABLE "test_steps"
ADD COLUMN "sndeskSentAt" TIMESTAMP(3),
ADD COLUMN "sndeskSentAction" TEXT,
ADD COLUMN "sndeskSentHash" TEXT;

CREATE INDEX "test_steps_reportId_sndeskSentAt_idx"
ON "test_steps"("reportId", "sndeskSentAt");
