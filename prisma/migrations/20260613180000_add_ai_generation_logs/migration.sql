CREATE TABLE "ai_generation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_generation_logs_userId_createdAt_idx"
ON "ai_generation_logs"("userId", "createdAt");

CREATE INDEX "ai_generation_logs_provider_status_createdAt_idx"
ON "ai_generation_logs"("provider", "status", "createdAt");

ALTER TABLE "ai_generation_logs"
ADD CONSTRAINT "ai_generation_logs_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
