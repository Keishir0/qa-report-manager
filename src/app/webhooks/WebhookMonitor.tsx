"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import SndeskIntegrationConfig from "@/components/sndesk/SndeskIntegrationConfig";

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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

interface SecretResponse {
  success: boolean;
  data?: {
    configured: boolean;
    updatedAt: string | null;
  };
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

function getWebhookStatusColor(status: string) {
  switch (status) {
    case "pendencia_criada":
      return "bg-warn/10 text-warn border border-warn/30";
    case "ignorado":
      return "bg-bad/10 text-bad border border-bad/30";
    case "recebido":
      return "bg-ok/10 text-ok border border-ok/30";
    case "erro":
      return "bg-bad/10 text-bad border border-bad/30";
    default:
      return "bg-neutral/10 text-neutral border border-neutral/30";
  }
}

function getWebhookStatusVar(status: string) {
  switch (status) {
    case "pendencia_criada":
      return "rgb(var(--warn))";
    case "ignorado":
    case "erro":
      return "rgb(var(--bad))";
    case "recebido":
      return "rgb(var(--ok))";
    default:
      return "rgb(var(--neutral))";
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function WebhookMonitor() {
  const pageSize = 10;
  const [eventos, setEventos] = useState<WebhookEvent[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [endpointUrl, setEndpointUrl] = useState("/api/webhooks/chamados");
  const [secretInput, setSecretInput] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [secretUpdatedAt, setSecretUpdatedAt] = useState<string | null>(null);
  const [secretMessage, setSecretMessage] = useState<string | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [isSecretLoading, setIsSecretLoading] = useState(true);
  const [isSecretSaving, setIsSecretSaving] = useState(false);

  const loadSecretStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/webhooks/chamados/secret", {
        cache: "no-store",
      });
      const result = (await response.json()) as SecretResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel carregar o secret");
      }

      setSecretConfigured(Boolean(result.data?.configured));
      setSecretUpdatedAt(result.data?.updatedAt || null);
      setSecretError(null);
    } catch (err: any) {
      setSecretError(err.message || "Erro ao carregar o secret");
    } finally {
      setIsSecretLoading(false);
    }
  }, []);

  async function saveSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const secret = secretInput.trim();

    if (!secret) {
      setSecretError("Informe o secret da webhook");
      setSecretMessage(null);
      return;
    }

    setIsSecretSaving(true);
    setSecretError(null);
    setSecretMessage(null);

    try {
      const response = await fetch("/api/webhooks/chamados/secret", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      });
      const result = (await response.json()) as SecretResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel salvar o secret");
      }

      setSecretInput("");
      setSecretConfigured(true);
      setSecretUpdatedAt(result.data?.updatedAt || new Date().toISOString());
      setSecretMessage("Secret salvo com sucesso");
    } catch (err: any) {
      setSecretError(err.message || "Erro ao salvar o secret");
    } finally {
      setIsSecretSaving(false);
    }
  }

  const loadEventos = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/webhooks/chamados?page=${page}&limit=${pageSize}`,
        {
        cache: "no-store",
        }
      );
      const result = (await response.json()) as WebhookResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel carregar eventos");
      }

      setEventos(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
        if (page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
        }
      }
      setError(null);
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || "Erro ao carregar eventos");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    setEndpointUrl(`${window.location.origin}/api/webhooks/chamados`);
    loadSecretStatus();
    loadEventos();

    const interval = window.setInterval(loadEventos, 3000);

    return () => window.clearInterval(interval);
  }, [loadEventos, loadSecretStatus]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <PageHeader
        title="Webhooks"
        description="Monitoramento dos eventos recebidos do sistema externo de chamados."
      >
        <Button variant="secondary" onClick={loadEventos} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <div className="card p-4">
          <span className="label mb-0">Endpoint</span>
          <code className="mt-2 block overflow-x-auto rounded-[8px] border border-line bg-panel2 px-3 py-2 text-[12px] font-semibold text-fg2">
            POST {endpointUrl}
          </code>
        </div>

        <div className="card p-4">
          <span className="label mb-0">Atualizacao</span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-fg2">A cada 3 segundos</span>
            <span className="rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[12px] font-bold text-ok">
              Ativo
            </span>
          </div>
          {lastUpdate && (
            <p className="mt-2 text-[12px] font-medium text-muted">
              Ultima leitura: {formatDate(lastUpdate.toISOString())}
            </p>
          )}
        </div>
      </section>

      <form onSubmit={saveSecret} className="card p-4">
        <div className="flex flex-col gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="label mb-0">Secret da webhook</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                  secretConfigured ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"
                }`}
              >
                {isSecretLoading
                  ? "Verificando"
                  : secretConfigured
                  ? "Configurado"
                  : "Nao configurado"}
              </span>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <Input
                  id="webhook-secret"
                  type="password"
                  value={secretInput}
                  onChange={(event) => setSecretInput(event.target.value)}
                  placeholder={
                    secretConfigured
                      ? "Digite um novo secret para substituir o atual"
                      : "Digite o bearer token informado pelo sistema externo"
                  }
                  autoComplete="off"
                />
              </div>
              <Button type="submit" isLoading={isSecretSaving}>
                Salvar secret
              </Button>
            </div>
            {secretUpdatedAt && (
              <p className="mt-2 text-[12px] font-medium text-muted">
                Atualizado em: {formatDate(secretUpdatedAt)}
              </p>
            )}
            {secretMessage && (
              <p className="mt-2 text-[12px] font-bold text-ok">{secretMessage}</p>
            )}
            {secretError && (
              <p className="mt-2 text-[12px] font-bold text-bad">{secretError}</p>
            )}
          </div>
        </div>
      </form>

      <SndeskIntegrationConfig />

      {error && (
        <div className="rounded-[14px] border border-bad/30 bg-bad/8 px-4 py-3 text-[13px] font-semibold text-bad">
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
        footer={
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemLabel="eventos"
            onPageChange={(nextPage) => setPage(nextPage)}
            isLoading={isLoading}
          />
        }
      >
        {eventos.map((evento) => (
          <tr
            key={evento.id}
            data-row-accent={getWebhookStatusVar(evento.status)}
            className="text-[13px] transition-colors hover:bg-panel2"
          >
            <td className="p-4">
              <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[12px] font-bold text-accent">
                {evento.event}
              </span>
            </td>
            <td className="p-4 font-mono font-bold text-fg">{evento.idChamado}</td>
            <td className="p-4 font-mono font-semibold text-fg2">{evento.idRef}</td>
            <td className="whitespace-nowrap p-4 font-mono text-faint">
              {formatDate(evento.receivedAt)}
            </td>
            <td className="p-4">
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${getWebhookStatusColor(evento.status)}`}>
                {evento.status}
              </span>
            </td>
            <td className="p-4 text-[12px] text-muted">
              <div className="max-w-[180px] truncate" title={evento.sourceIp || ""}>
                {evento.sourceIp || "Nao informado"}
              </div>
            </td>
            <td className="p-4">
              <pre className="max-h-44 min-w-[360px] overflow-auto rounded-[8px] border border-line bg-panel2 p-3 text-[12px] leading-relaxed text-fg2">
                {formatJson(evento.rawPayload)}
              </pre>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
