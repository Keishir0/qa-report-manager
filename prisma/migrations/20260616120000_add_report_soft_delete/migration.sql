ALTER TABLE "test_reports"
ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "test_reports_deleted_at_idx" ON "test_reports"("deleted_at");
