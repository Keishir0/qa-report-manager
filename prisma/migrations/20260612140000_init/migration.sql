CREATE TABLE "test_reports" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "systemName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "screenPath" TEXT NOT NULL,
    "functionality" TEXT NOT NULL,
    "bugDescription" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "generalStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "test_steps" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "expectedResult" TEXT NOT NULL,
    "actualResult" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "test_reports_code_key" ON "test_reports"("code");

ALTER TABLE "test_steps"
ADD CONSTRAINT "test_steps_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "test_reports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
