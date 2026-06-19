"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Textarea from "@/components/ui/Textarea";
import Toast from "@/components/ui/Toast";
import { useAuthUser } from "@/components/auth/AuthProvider";

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

interface PendingTicketActionsMenuProps {
  ticket: PendingTicket;
  isLoading: boolean;
  onView: (ticket: PendingTicket) => void;
  onDeleteReport: (ticket: PendingTicket) => void;
  onApprove: (ticketId: string) => void;
  onReject: (ticketId: string) => void;
}

const ACTIONS_MENU_WIDTH = 176;
const ACTIONS_MENU_HEIGHT = 180;
const ACTIONS_VIEW_ONLY_HEIGHT = 52;
const VIEWPORT_MARGIN = 8;

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

function PendingTicketActionsMenu({
  ticket,
  isLoading,
  onView,
  onDeleteReport,
  onApprove,
  onReject,
}: PendingTicketActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuHeight = ticket.reportId
    ? ACTIONS_MENU_HEIGHT
    : ACTIONS_VIEW_ONLY_HEIGHT;

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const fitsBelow =
        rect.bottom + VIEWPORT_MARGIN + menuHeight <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + VIEWPORT_MARGIN
        : Math.max(VIEWPORT_MARGIN, rect.top - menuHeight - VIEWPORT_MARGIN);
      const left = Math.min(
        window.innerWidth - ACTIONS_MENU_WIDTH - VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, rect.right - ACTIONS_MENU_WIDTH)
      );

      setPosition({ top, left });
    };

    const closeMenu = () => setIsOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        buttonRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [isOpen, menuHeight]);

  const closeMenu = () => setIsOpen(false);

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Acoes da pendencia ${ticket.idChamado}`}
      className="fixed z-[100] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10"
      style={{ top: position.top, left: position.left }}
    >
      <button
        type="button"
        role="menuitem"
        disabled={isLoading}
        onClick={() => {
          closeMenu();
          onView(ticket);
        }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver
      </button>

      {ticket.reportId && (
        <>
          <div className="mx-2 my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoading}
            onClick={() => {
              closeMenu();
              onApprove(ticket.id);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Aprovar
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isLoading}
            onClick={() => {
              closeMenu();
              onReject(ticket.id);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Recusar
          </button>
          <div className="mx-2 my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoading}
            onClick={() => {
              closeMenu();
              onDeleteReport(ticket);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir relatorio
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Abrir acoes da pendencia ${ticket.idChamado}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isLoading}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
}

export default function PendenciasClient() {
  const currentUser = useAuthUser();
  const isAdmin = currentUser?.role === "ADMIN";
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

      {isAdmin && (
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
      )}

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
        tableClassName="w-full min-w-[1040px] table-fixed text-left border-collapse"
        headerCellClassName="px-4 py-3"
        headerClassNames={[
          "w-[7%]",
          "w-[27%]",
          "w-[12%]",
          "w-[12%]",
          "w-[13%] text-center",
          "w-[9%]",
          "w-[12%]",
          "w-[8%] text-right",
        ]}
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
            <td className="p-4 truncate text-slate-700" title={getCliente(ticket)}>
              {getCliente(ticket)}
            </td>
            <td className="p-4 text-center">
              <span
                className="inline-flex min-w-[112px] max-w-[160px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-center text-[11px] font-bold leading-none"
                style={{
                  backgroundColor: ticket.statusCor || "#e2e8f0",
                  color: "#0f172a",
                }}
              >
                {ticket.statusDescricao || ticket.statusId || "Nao informado"}
              </span>
            </td>
            <td className="p-4 text-center">
              {ticket.reportId ? (
                <button
                  type="button"
                  onClick={() => viewTicket(ticket)}
                  className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                  title="Abrir relatorio vinculado"
                >
                  {ticket.reportCode || "Relatorio criado"}
                </button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => createReport(ticket.id)}
                  isLoading={actionId === ticket.id}
                  className="px-3 py-1.5 text-xs"
                >
                  Criar relatorio
                </Button>
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
            <td className="p-4 text-right">
              <PendingTicketActionsMenu
                ticket={ticket}
                isLoading={actionId === ticket.id}
                onView={viewTicket}
                onDeleteReport={deleteLinkedReport}
                onApprove={approve}
                onReject={reject}
              />
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
