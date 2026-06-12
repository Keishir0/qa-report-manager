"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface WebhookEvent {
  id: string;
  event: string;
  idChamado: string;
  idRef: string;
  customJson: unknown;
  rawPayload: unknown;
  sourceIp?: string | null;
  userAgent?: string | null;
  status: string;
  receivedAt: string;
}

interface WebhookResponse {
  success: boolean;
  data: WebhookEvent[];
  message?: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function WebhookMonitor() {
  const [eventos, setEventos] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [endpointUrl, setEndpointUrl] = useState("/api/webhooks/chamados");

  const loadEventos = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks/chamados?limit=50", {
        cache: "no-store",
      });
      const result = (await response.json()) as WebhookResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel carregar eventos");
      }

      setEventos(result.data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || "Erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setEndpointUrl(`${window.location.origin}/api/webhooks/chamados`);
    loadEventos();

    const interval = window.setInterval(loadEventos, 3000);

    return () => window.clearInterval(interval);
  }, [loadEventos]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in sm:space-y-8">
      <PageHeader
        title="Webhooks"
        description="Monitoramento dos eventos recebidos do sistema externo de chamados."
      >
        <Button variant="secondary" onClick={loadEventos} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Endpoint
          </span>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100">
            POST {endpointUrl}
          </code>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Atualizacao
          </span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-800">
              A cada 3 segundos
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Ativo
            </span>
          </div>
          {lastUpdate && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Ultima leitura: {formatDate(lastUpdate.toISOString())}
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <DataTable
        headers={["Evento", "Chamado", "Referencia", "Recebido em", "Status", "Origem", "Payload"]}
        isLoading={isLoading}
        isEmpty={!isLoading && eventos.length === 0}
        emptyState={
          <EmptyState
            title="Nenhum evento recebido"
            description="Envie um POST para o endpoint da webhook para acompanhar o payload nesta tela."
          />
        }
        className="[&_table]:min-w-[1080px]"
      >
        {eventos.map((evento) => (
          <tr key={evento.id} className="text-sm transition-colors hover:bg-slate-50">
            <td className="p-4">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {evento.event}
              </span>
            </td>
            <td className="p-4 font-mono font-bold text-slate-900">
              {evento.idChamado}
            </td>
            <td className="p-4 font-mono font-semibold text-slate-700">
              {evento.idRef}
            </td>
            <td className="p-4 whitespace-nowrap text-slate-600">
              {formatDate(evento.receivedAt)}
            </td>
            <td className="p-4">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {evento.status}
              </span>
            </td>
            <td className="p-4 text-xs text-slate-500">
              <div className="max-w-[180px] truncate" title={evento.sourceIp || ""}>
                {evento.sourceIp || "Nao informado"}
              </div>
            </td>
            <td className="p-4">
              <pre className="max-h-44 min-w-[360px] overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
                {formatJson(evento.rawPayload)}
              </pre>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
