"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Textarea from "@/components/ui/Textarea";
import Toast from "@/components/ui/Toast";

interface SndeskConfigView {
  baseUrl: string;
  tokenConfigured: boolean;
  defaultUserId: string;
  pendingStatusIds: number[];
  approveStatusId: string;
  rejectStatusId: string;
  approveTemplate: string;
  rejectTemplate: string;
  visibleClient: boolean;
  emailClient: boolean;
  emailTechnician: boolean;
}

interface PendingTicket {
  id: string;
  idChamado: string;
  statusId: number | null;
  statusDescricao: string | null;
  statusCor: string | null;
  chamadoSnapshot: any;
  reportId: string | null;
  reportCode: string | null;
  state: string;
  lastError: string | null;
  updatedAt: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getChamadoTitle(ticket: PendingTicket) {
  return (
    ticket.chamadoSnapshot?.assunto ||
    ticket.chamadoSnapshot?.nome ||
    `Chamado ${ticket.idChamado}`
  );
}

function getCliente(ticket: PendingTicket) {
  return (
    ticket.chamadoSnapshot?.cliente?.nome ||
    ticket.chamadoSnapshot?.nome ||
    "Nao informado"
  );
}

function getTicketStateColor(state: string) {
  const normalizedState = state.toLowerCase();

  if (normalizedState.includes("aprovado")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  }

  if (
    normalizedState.includes("recusado") ||
    normalizedState.includes("negado") ||
    normalizedState.includes("reprovado")
  ) {
    return "bg-rose-50 text-rose-700 border border-rose-100";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export default function PendenciasClient() {
  const [config, setConfig] = useState<SndeskConfigView | null>(null);
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastTicketsRefresh, setLastTicketsRefresh] = useState<Date | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const isPollingTickets = useRef(false);
  const [configForm, setConfigForm] = useState({
    baseUrl: "",
    token: "",
    defaultUserId: "",
    pendingStatusIds: "",
    approveStatusId: "",
    rejectStatusId: "",
    approveTemplate: "",
    rejectTemplate: "",
    visibleClient: true,
    emailClient: false,
    emailTechnician: false,
  });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadConfig = useCallback(async () => {
    const response = await fetch("/api/sndesk/config", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Nao foi possivel carregar a configuracao.");
    }

    setConfig(result.data);
  }, []);

  useEffect(() => {
    if (!config) return;

    setConfigForm((current) => ({
      ...current,
      baseUrl: config.baseUrl || "",
      defaultUserId: config.defaultUserId || "",
      pendingStatusIds: config.pendingStatusIds?.join(",") || "",
      approveStatusId: config.approveStatusId || "",
      rejectStatusId: config.rejectStatusId || "",
      approveTemplate: config.approveTemplate || "",
      rejectTemplate: config.rejectTemplate || "",
      visibleClient: config.visibleClient,
      emailClient: config.emailClient,
      emailTechnician: config.emailTechnician,
    }));
  }, [config]);

  const loadTickets = useCallback(async () => {
    const response = await fetch("/api/sndesk/pendencias", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Nao foi possivel carregar pendencias.");
    }

    setTickets(result.data);
    setLastTicketsRefresh(new Date());
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadConfig(), loadTickets()]);
    } catch (error: any) {
      setToast({ message: error.message || "Erro ao carregar dados.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [loadConfig, loadTickets]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = window.setInterval(async () => {
      if (document.hidden || isPollingTickets.current) return;

      isPollingTickets.current = true;
      try {
        await loadTickets();
      } catch {
        // Mantem a atualizacao automatica silenciosa para nao interromper o usuario.
      } finally {
        isPollingTickets.current = false;
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [autoRefreshEnabled, loadTickets]);

  async function callPendingAction(ticketId: string, path: string, options: RequestInit = {}) {
    setActionId(ticketId);
    try {
      const response = await fetch(`/api/sndesk/pendencias/${ticketId}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Acao nao concluida.");
      }

      await loadTickets();
      return result.data;
    } catch (error: any) {
      setToast({ message: error.message || "Erro ao executar acao.", type: "error" });
      return null;
    } finally {
      setActionId(null);
    }
  }

  async function refreshTicket(ticketId: string) {
    const data = await callPendingAction(ticketId, "", {
      method: "PATCH",
      body: JSON.stringify({ action: "refresh" }),
    });
    if (data) setToast({ message: "Chamado atualizado pela API SNDesk.", type: "success" });
  }

  async function createReport(ticketId: string) {
    const report = await callPendingAction(ticketId, "/relatorio", {
      method: "POST",
    });

    if (report?.id) window.location.href = `/reports/${report.id}`;
  }

  async function deleteLinkedReport(ticket: PendingTicket) {
    if (!ticket.reportId) return;

    const confirmed = window.confirm(
      `Deseja excluir o relatorio ${ticket.reportCode || ""} desta pendencia? Ele sera ocultado das listas, mas continuara salvo no banco.`
    );

    if (!confirmed) return;

    const deleted = await callPendingAction(ticket.id, "/relatorio", {
      method: "DELETE",
    });

    if (deleted) {
      setToast({
        message: "Relatorio desvinculado e excluido da lista. A pendencia pode gerar novo teste.",
        type: "success",
      });
    }
  }

  async function viewTicket(ticket: PendingTicket) {
    if (ticket.reportId) {
      window.location.href = `/reports/${ticket.reportId}`;
      return;
    }

    await createReport(ticket.id);
  }

  async function approve(ticketId: string) {
    const data = await callPendingAction(ticketId, "/aprovar", { method: "POST" });
    if (data) setToast({ message: "Aprovado e enviado ao SNDesk.", type: "success" });
  }

  async function reject(ticketId: string) {
    const data = await callPendingAction(ticketId, "/recusar", { method: "POST" });
    if (data) setToast({ message: "Recusa enviada ao SNDesk.", type: "success" });
  }

  async function saveConfig() {
    setIsSavingConfig(true);
    try {
      const response = await fetch("/api/sndesk/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configForm),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel salvar a configuracao.");
      }

      setConfig(result.data);
      setConfigForm((current) => ({ ...current, token: "" }));
      setToast({ message: "Configuracao SNDesk salva no banco.", type: "success" });
    } catch (error: any) {
      setToast({ message: error.message || "Erro ao salvar configuracao.", type: "error" });
    } finally {
      setIsSavingConfig(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in sm:space-y-8">
      <PageHeader
        title="Pendencias de Teste"
        description="Chamados do SNDesk aguardando validacao de QA."
      >
        <Button variant="secondary" onClick={loadAll} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <section>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Configuracao SNDesk
          </span>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <div>
              <span className="block text-xs font-bold text-slate-400">Dominio</span>
              <span className="font-semibold">{config?.baseUrl || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400">Token API</span>
              <span className="font-semibold">
                {config?.tokenConfigured ? "Configurado" : "Nao configurado"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400">Status pendentes</span>
              <span className="font-semibold">
                {config?.pendingStatusIds?.join(", ") || "Nao configurado"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400">Usuario padrao</span>
              <span className="font-semibold">{config?.defaultUserId || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400">Aprovacao</span>
              <span className="font-semibold">{config?.approveStatusId || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400">Recusa</span>
              <span className="font-semibold">{config?.rejectStatusId || "Nao configurado"}</span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-slate-500">
            O token SNDesk nunca e exibido depois de salvo. Informe um novo token
            somente quando quiser substituir o atual.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Editar integracao
            </span>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Esses dados ficam salvos no banco em `webhook_settings`.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            id="sndesk-base-url"
            label="Dominio SNDesk"
            value={configForm.baseUrl}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, baseUrl: event.target.value }))
            }
            placeholder="https://seudominio.sndesk.com.br"
          />
          <Input
            id="sndesk-api-token"
            label="Novo token API"
            type="password"
            value={configForm.token}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, token: event.target.value }))
            }
            placeholder={config?.tokenConfigured ? "Token ja configurado" : "Bearer token"}
            autoComplete="off"
          />
          <Input
            id="sndesk-default-user"
            label="Usuario padrao"
            value={configForm.defaultUserId}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, defaultUserId: event.target.value }))
            }
            placeholder="1"
          />
          <Input
            id="sndesk-pending-status"
            label="Status pendentes"
            value={configForm.pendingStatusIds}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, pendingStatusIds: event.target.value }))
            }
            placeholder="1,5"
          />
          <Input
            id="sndesk-approve-status"
            label="Status ao aprovar"
            value={configForm.approveStatusId}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, approveStatusId: event.target.value }))
            }
            placeholder="2"
          />
          <Input
            id="sndesk-reject-status"
            label="Status ao recusar"
            value={configForm.rejectStatusId}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, rejectStatusId: event.target.value }))
            }
            placeholder="1"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Textarea
            id="sndesk-approve-template"
            label="Modelo de aprovacao"
            value={configForm.approveTemplate}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, approveTemplate: event.target.value }))
            }
            rows={6}
          />
          <Textarea
            id="sndesk-reject-template"
            label="Modelo de recusa"
            value={configForm.rejectTemplate}
            onChange={(event) =>
              setConfigForm((current) => ({ ...current, rejectTemplate: event.target.value }))
            }
            rows={6}
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={configForm.visibleClient}
                onChange={(event) =>
                  setConfigForm((current) => ({ ...current, visibleClient: event.target.checked }))
                }
              />
              Visivel ao cliente
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={configForm.emailClient}
                onChange={(event) =>
                  setConfigForm((current) => ({ ...current, emailClient: event.target.checked }))
                }
              />
              Enviar email ao cliente
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={configForm.emailTechnician}
                onChange={(event) =>
                  setConfigForm((current) => ({ ...current, emailTechnician: event.target.checked }))
                }
              />
              Enviar email ao tecnico
            </label>
          </div>
          <Button onClick={saveConfig} isLoading={isSavingConfig}>
            Salvar configuracao
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            {!autoRefreshEnabled ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Atualizacao automatica pausada
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Atualizacao automatica ativa
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {lastTicketsRefresh && (
              <span className="text-xs font-semibold text-slate-400">
                Ultima leitura: {formatDate(lastTicketsRefresh.toISOString())}
              </span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-3 text-xs font-bold text-slate-600">
              <span>Auto atualizar</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoRefreshEnabled}
                onClick={() => setAutoRefreshEnabled((current) => !current)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${
                  autoRefreshEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoRefreshEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        <DataTable
        headers={[
          "ID",
          "Chamado",
          "Cliente",
          "Status",
          "Relatorio",
          "Estado",
          "Atualizado em",
          "Acoes",
        ]}
        isLoading={isLoading}
        isEmpty={!isLoading && tickets.length === 0}
        emptyState={
          <EmptyState
            title="Nenhuma pendencia encontrada"
            description="Quando o SNDesk enviar um status configurado para teste, a pendencia aparecera aqui."
          />
        }
        className="[&_table]:min-w-[1080px]"
      >
        {tickets.map((ticket) => (
          <tr key={ticket.id} className="text-sm transition-colors hover:bg-slate-50">
            <td className="p-4 whitespace-nowrap align-middle">
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                #{ticket.idChamado}
              </span>
            </td>
            <td className="p-4 min-w-[320px]">
              <div
                className="line-clamp-2 max-w-[380px] text-sm font-bold leading-snug text-slate-900"
                title={getChamadoTitle(ticket)}
              >
                {getChamadoTitle(ticket)}
              </div>
              {ticket.lastError && (
                <div className="mt-1 max-w-[260px] truncate text-xs font-bold text-red-600">
                  {ticket.lastError}
                </div>
              )}
            </td>
            <td className="p-4 max-w-[220px] truncate text-slate-700">
              {getCliente(ticket)}
            </td>
            <td className="p-4">
              <span
                className="inline-flex max-w-[160px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-center text-[11px] font-bold leading-none"
                style={{
                  backgroundColor: ticket.statusCor || "#e2e8f0",
                  color: "#0f172a",
                }}
              >
                {ticket.statusDescricao || ticket.statusId || "Nao informado"}
              </span>
            </td>
            <td className="p-4">
              <Button
                variant="secondary"
                onClick={() => createReport(ticket.id)}
                disabled={Boolean(ticket.reportId)}
                isLoading={actionId === ticket.id}
                className="px-3 py-1.5 text-xs"
              >
                Criar relatorio
              </Button>
              {ticket.reportId && (
                <div className="mt-2 text-xs font-bold text-slate-500">
                  {ticket.reportCode || "Relatorio criado"}
                </div>
              )}
            </td>
            <td className="p-4">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getTicketStateColor(ticket.state)}`}>
                {ticket.state}
              </span>
            </td>
            <td className="p-4 whitespace-nowrap text-slate-600">
              {formatDate(ticket.updatedAt)}
            </td>
            <td className="p-4">
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => viewTicket(ticket)}
                  isLoading={actionId === ticket.id}
                  className="px-3 py-1.5 text-xs text-indigo-700"
                  icon={
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  }
                >
                  Ver
                </Button>
                {ticket.reportId && (
                  <Button
                    variant="danger"
                    onClick={() => deleteLinkedReport(ticket)}
                    isLoading={actionId === ticket.id}
                    className="px-3 py-1.5 text-xs"
                  >
                    Excluir relatorio
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        </DataTable>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
