CREATE TABLE "server_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "server_logs_createdAt_idx" ON "server_logs"("createdAt");
CREATE INDEX "server_logs_level_createdAt_idx" ON "server_logs"("level", "createdAt");
