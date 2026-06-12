ALTER TABLE "test_reports" ADD COLUMN "sndesk_chamado_id" TEXT;

CREATE TABLE "qa_pending_tickets" (
    "id" TEXT NOT NULL,
    "idChamado" TEXT NOT NULL,
    "statusId" INTEGER,
    "statusDescricao" TEXT,
    "statusCor" TEXT,
    "chamadoSnapshot" JSONB,
    "reportId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'pendente',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_pending_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "test_reports_sndesk_chamado_id_key" ON "test_reports"("sndesk_chamado_id");
CREATE UNIQUE INDEX "qa_pending_tickets_idChamado_key" ON "qa_pending_tickets"("idChamado");
CREATE UNIQUE INDEX "qa_pending_tickets_reportId_key" ON "qa_pending_tickets"("reportId");
CREATE INDEX "qa_pending_tickets_state_idx" ON "qa_pending_tickets"("state");
CREATE INDEX "qa_pending_tickets_statusId_idx" ON "qa_pending_tickets"("statusId");

ALTER TABLE "qa_pending_tickets" ADD CONSTRAINT "qa_pending_tickets_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "test_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
