"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
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
  reportTesterId?: string | null;
  state: string;
  lastError: string | null;
  updatedAt: string;
  stepsCount?: number;
  pendingStepsCount?: number;
  newStepsCount?: number;
  changedStepsCount?: number;
}

interface QaTransferOption {
  id: string;
  name: string;
}

interface PendingTicketActionsMenuProps {
  ticket: PendingTicket;
  isLoading: boolean;
  qaTransferOptions: QaTransferOption[];
  onView: (ticket: PendingTicket) => void;
  onDeleteReport: (ticket: PendingTicket) => void;
  onApprove: (ticketId: string) => void;
  onReject: (ticketId: string) => void;
  onTransfer: (ticketId: string, targetUserId: string) => void;
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
    return "bg-ok/10 text-ok border border-ok/30";
  }

  if (
    normalizedState.includes("recusado") ||
    normalizedState.includes("negado") ||
    normalizedState.includes("reprovado")
  ) {
    return "bg-bad/10 text-bad border border-bad/30";
  }

  return "bg-neutral/10 text-neutral border border-neutral/30";
}

function getTicketStateVar(state: string) {
  const normalizedState = state.toLowerCase();

  if (normalizedState.includes("aprovado")) return "rgb(var(--ok))";
  if (
    normalizedState.includes("recusado") ||
    normalizedState.includes("negado") ||
    normalizedState.includes("reprovado")
  ) {
    return "rgb(var(--bad))";
  }

  return "rgb(var(--neutral))";
}

function PendingTicketActionsMenu({
  ticket,
  isLoading,
  qaTransferOptions,
  onView,
  onDeleteReport,
  onApprove,
  onReject,
  onTransfer,
}: PendingTicketActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const transferTargets = qaTransferOptions.filter(
    (qa) => qa.id !== ticket.reportTesterId
  );
  const transferExtraHeight = transferOpen
    ? 40 + Math.min(transferTargets.length, 4) * 36
    : 0;
  const menuHeight =
    (ticket.reportId ? ACTIONS_MENU_HEIGHT : ACTIONS_VIEW_ONLY_HEIGHT) +
    (transferTargets.length > 0 ? 36 : 0) +
    transferExtraHeight;
  const pendingStepsCount = ticket.pendingStepsCount ?? ticket.stepsCount ?? 0;

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

  const closeMenu = () => {
    setIsOpen(false);
    setTransferOpen(false);
  };

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Acoes da pendencia ${ticket.idChamado}`}
      className="fixed z-[100] w-44 overflow-hidden rounded-[10px] border border-line bg-panel py-1.5 shadow-lg"
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
        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver
      </button>

      {transferTargets.length > 0 && (
        <>
          <div className="mx-2 my-1 border-t border-hairline" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoading}
            onClick={() => setTransferOpen((open) => !open)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-fg2 transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Transferir
          </button>
          {transferOpen && (
            <div className="max-h-36 overflow-y-auto border-t border-hairline bg-bg/40 py-1">
              {transferTargets.map((qa) => (
                <button
                  key={qa.id}
                  type="button"
                  role="menuitem"
                  disabled={isLoading}
                  onClick={() => {
                    closeMenu();
                    onTransfer(ticket.id, qa.id);
                  }}
                  className="flex w-full items-center gap-2.5 px-5 py-2 text-left text-[13px] font-medium text-fg2 transition-colors hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {qa.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {ticket.reportId && (
        <>
          <div className="mx-2 my-1 border-t border-hairline" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoading || pendingStepsCount === 0}
            title={pendingStepsCount === 0 ? "Adicione ou altere pelo menos um passo para enviar ao SNDesk." : undefined}
            onClick={() => {
              closeMenu();
              onApprove(ticket.id);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-ok transition-colors hover:bg-ok/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Aprovar
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isLoading || pendingStepsCount === 0}
            title={pendingStepsCount === 0 ? "Adicione ou altere pelo menos um passo para enviar ao SNDesk." : undefined}
            onClick={() => {
              closeMenu();
              onReject(ticket.id);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-bad transition-colors hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Recusar
          </button>
          <div className="mx-2 my-1 border-t border-hairline" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoading}
            onClick={() => {
              closeMenu();
              onDeleteReport(ticket);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-bad transition-colors hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-60"
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
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line text-muted transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent focus:outline-none focus:ring-[3px] focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
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
  const [config, setConfig] = useState<SndeskConfigView | null>(null);
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [qaTransferOptions, setQaTransferOptions] = useState<QaTransferOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastTicketsRefresh, setLastTicketsRefresh] = useState<Date | null>(null);

  const uniqueStatuses = Array.from(
    new Set(
      tickets
        .map((t) => t.statusDescricao || (t.statusId ? String(t.statusId) : ""))
        .filter(Boolean)
    )
  ).sort() as string[];

  const filteredTickets = tickets.filter((ticket) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idMatch = ticket.idChamado.toLowerCase().includes(term);
      const titleMatch = getChamadoTitle(ticket).toLowerCase().includes(term);
      const clientMatch = getCliente(ticket).toLowerCase().includes(term);
      const statusMatch = String(ticket.statusDescricao || ticket.statusId || "")
        .toLowerCase()
        .includes(term);
      if (!idMatch && !titleMatch && !clientMatch && !statusMatch) {
        return false;
      }
    }

    if (selectedStatus) {
      const statusStr = String(ticket.statusDescricao || ticket.statusId || "");
      if (statusStr !== selectedStatus) return false;
    }

    if (selectedState) {
      if (ticket.state !== selectedState) return false;
    }

    return true;
  });

  const totalPages = Math.max(Math.ceil(filteredTickets.length / PAGE_SIZE), 1);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage || isLoading) return;
    setCurrentPage(nextPage);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedState]);

  useEffect(() => {
    const calculatedTotalPages = Math.max(Math.ceil(filteredTickets.length / PAGE_SIZE), 1);
    if (currentPage > calculatedTotalPages) {
      setCurrentPage(calculatedTotalPages);
    }
  }, [filteredTickets.length, currentPage]);
  const [actionId, setActionId] = useState<string | null>(null);
  const isPollingTickets = useRef(false);
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

  const loadQaTransferOptions = useCallback(async () => {
    const response = await fetch("/api/users/options", { cache: "no-store" });
    const result = await response.json();

    if (!response.ok || !result.success) return;

    const options = (result.data as any[])
      .filter((user) => (user.role === "QA" || user.role === "ADMIN") && user.sndeskStatusId)
      .map((user) => ({ id: user.id, name: user.name }));

    setQaTransferOptions(options);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadConfig(), loadTickets(), loadQaTransferOptions()]);
    } catch (error: any) {
      setToast({ message: error.message || "Erro ao carregar dados.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [loadConfig, loadTickets, loadQaTransferOptions]);

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

  async function transfer(ticketId: string, targetUserId: string) {
    const data = await callPendingAction(ticketId, "/transferir", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
    if (data) setToast({ message: "Chamado transferido no SNDesk.", type: "success" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
      <PageHeader
        title="Pendencias de Teste"
        description="Chamados do SNDesk aguardando validacao de QA."
      >
        <Button variant="secondary" onClick={loadAll} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <section>
        <div className="card p-4">
          <span className="label mb-0">Configuracao SNDesk</span>
          <div className="mt-3 grid gap-3 text-[13px] text-fg2 md:grid-cols-3">
            <div>
              <span className="block text-[11px] font-bold text-faint">Dominio</span>
              <span className="font-semibold">{config?.baseUrl || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-faint">Token API</span>
              <span className="font-semibold">
                {config?.tokenConfigured ? "Configurado" : "Nao configurado"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-faint">Status pendentes</span>
              <span className="font-semibold">
                {config?.pendingStatusIds?.join(", ") || "Nao configurado"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-faint">Usuario padrao</span>
              <span className="font-semibold">{config?.defaultUserId || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-faint">Aprovacao</span>
              <span className="font-semibold">{config?.approveStatusId || "Nao configurado"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-faint">Recusa</span>
              <span className="font-semibold">{config?.rejectStatusId || "Nao configurado"}</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-medium text-muted">
            O token SNDesk nunca e exibido depois de salvo. Informe um novo token
            somente quando quiser substituir o atual.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <div className="card flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-fg2">
            {!autoRefreshEnabled ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-neutral" />
                Atualizacao automatica pausada
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-ok" />
                Atualizacao automatica ativa
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {lastTicketsRefresh && (
              <span className="text-[12px] font-semibold text-faint">
                Ultima leitura: {formatDate(lastTicketsRefresh.toISOString())}
              </span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-3 text-[12px] font-bold text-fg2">
              <span>Auto atualizar</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoRefreshEnabled}
                onClick={() => setAutoRefreshEnabled((current) => !current)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors ${
                  autoRefreshEnabled ? "bg-ok" : "bg-panel2"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-panel shadow-sm [transition:transform_150ms,background-color_200ms_ease] ${
                    autoRefreshEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Filtros Avançados */}
        <div className="card grid gap-4 p-4 md:grid-cols-3">
          <div>
            <label htmlFor="filter-search" className="label">
              Pesquisar
            </label>
            <input
              id="filter-search"
              type="text"
              placeholder="ID, título, cliente ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="label">
              Status SNDesk
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-full"
            >
              <option value="">Todos</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-state" className="label">
              Estado do Teste
            </label>
            <select
              id="filter-state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="input w-full"
            >
              <option value="">Todos</option>
              <option value="pendente">pendente</option>
              <option value="aprovado">aprovado</option>
              <option value="recusado">recusado</option>
            </select>
          </div>
        </div>

        <DataTable
        tableClassName="w-full min-w-[1040px] table-fixed text-left border-collapse"
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
        isEmpty={!isLoading && filteredTickets.length === 0}
        footer={
          totalPages > 1 ? (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredTickets.length}
              itemLabel="chamados"
              onPageChange={goToPage}
              isLoading={isLoading}
            />
          ) : undefined
        }
        emptyState={
          tickets.length === 0 ? (
            <EmptyState
              title="Nenhuma pendencia encontrada"
              description="Quando o SNDesk enviar um status configurado para teste, a pendencia aparecera aqui."
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-[13px] font-semibold text-fg2">
                Nenhuma pendência corresponde aos filtros aplicados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStatus("");
                  setSelectedState("");
                }}
                className="mt-3 text-[12px] font-bold text-accent hover:underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )
        }
      >
        {paginatedTickets.map((ticket) => (
          <tr
            key={ticket.id}
            data-row-accent={getTicketStateVar(ticket.state)}
            className="text-[13px] transition-colors hover:bg-panel2"
          >
            <td className="whitespace-nowrap p-4 align-middle">
              <span className="inline-flex rounded-full border border-line bg-panel2 px-2 py-0.5 font-mono text-[11px] font-bold text-fg2">
                #{ticket.idChamado}
              </span>
            </td>
            <td className="min-w-[320px] p-4">
              <div
                className="line-clamp-2 max-w-[380px] text-[13px] font-bold leading-snug text-fg"
                title={getChamadoTitle(ticket)}
              >
                {getChamadoTitle(ticket)}
              </div>
              {ticket.lastError && (
                <div className="mt-1 max-w-[260px] truncate text-[12px] font-bold text-bad">
                  {ticket.lastError}
                </div>
              )}
            </td>
            <td className="truncate p-4 text-fg2" title={getCliente(ticket)}>
              {getCliente(ticket)}
            </td>
            <td className="p-4 text-center">
              <span
                className="inline-flex min-w-[112px] max-w-[160px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-center text-[11px] font-bold leading-none"
                style={{
                  backgroundColor: ticket.statusCor || "rgb(var(--neutral) / 0.15)",
                  color: "rgb(var(--fg))",
                }}
              >
                {ticket.statusDescricao || ticket.statusId || "Nao informado"}
              </span>
            </td>
            <td className="p-4 text-center">
              {ticket.reportId ? (
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => viewTicket(ticket)}
                    className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[12px] font-bold text-accent transition-colors hover:bg-accent/20"
                    title="Abrir relatorio vinculado"
                  >
                    {ticket.reportCode || "Relatorio criado"}
                  </button>
                  <span className="text-[11px] font-bold text-faint">
                    {ticket.pendingStepsCount ?? 0} pendente(s) SNDesk
                  </span>
                </div>
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
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${getTicketStateColor(ticket.state)}`}>
                {ticket.state}
              </span>
            </td>
            <td className="whitespace-nowrap p-4 font-mono text-faint">
              {formatDate(ticket.updatedAt)}
            </td>
            <td className="p-4 text-right">
              <PendingTicketActionsMenu
                ticket={ticket}
                isLoading={actionId === ticket.id}
                qaTransferOptions={qaTransferOptions}
                onView={viewTicket}
                onDeleteReport={deleteLinkedReport}
                onApprove={approve}
                onReject={reject}
                onTransfer={transfer}
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
