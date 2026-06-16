"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
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
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "ignorado":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    case "recebido":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100";
    case "erro":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
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
    loadSecretStatus();
    loadEventos();

    const interval = window.setInterval(loadEventos, 3000);

    return () => window.clearInterval(interval);
  }, [loadEventos, loadSecretStatus]);

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

      <form
        onSubmit={saveSecret}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Secret da webhook
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  secretConfigured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isSecretLoading
                  ? "Verificando"
                  : secretConfigured
                  ? "Configurado"
                  : "Nao configurado"}
              </span>
            </div>
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
            {secretUpdatedAt && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Atualizado em: {formatDate(secretUpdatedAt)}
              </p>
            )}
            {secretMessage && (
              <p className="mt-2 text-xs font-bold text-emerald-700">
                {secretMessage}
              </p>
            )}
            {secretError && (
              <p className="mt-2 text-xs font-bold text-red-600">
                {secretError}
              </p>
            )}
          </div>

          <Button type="submit" isLoading={isSecretSaving}>
            Salvar secret
          </Button>
        </div>
      </form>

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
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${getWebhookStatusColor(
                  evento.status
                )}`}>
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
