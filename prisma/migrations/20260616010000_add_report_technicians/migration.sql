ALTER TABLE "test_reports"
ADD COLUMN "tester_id" TEXT,
ADD COLUMN "tester_name" TEXT,
ADD COLUMN "sndesk_technician_name" TEXT;

CREATE INDEX "test_reports_tester_id_idx" ON "test_reports"("tester_id");
CREATE INDEX "test_reports_tester_name_idx" ON "test_reports"("tester_name");
CREATE INDEX "test_reports_sndesk_technician_name_idx" ON "test_reports"("sndesk_technician_name");

ALTER TABLE "test_reports"
ADD CONSTRAINT "test_reports_tester_id_fkey"
FOREIGN KEY ("tester_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
