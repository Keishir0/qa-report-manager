-- CreateTable
CREATE TABLE "external_webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "idChamado" TEXT NOT NULL,
    "idRef" TEXT NOT NULL,
    "json" JSONB,
    "rawPayload" JSONB NOT NULL,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recebido',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_webhook_events_event_idx" ON "external_webhook_events"("event");

-- CreateIndex
CREATE INDEX "external_webhook_events_idChamado_idx" ON "external_webhook_events"("idChamado");

-- CreateIndex
CREATE INDEX "external_webhook_events_receivedAt_idx" ON "external_webhook_events"("receivedAt");
