"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
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
  stepsCount?: number;
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
            disabled={isLoading || ticket.stepsCount === 0}
            title={ticket.stepsCount === 0 ? "Adicione pelo menos um passo no relatorio para permitir aprovar." : undefined}
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
            disabled={isLoading || ticket.stepsCount === 0}
            title={ticket.stepsCount === 0 ? "Adicione pelo menos um passo no relatorio para permitir recusar." : undefined}
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
  const [config, setConfig] = useState<SndeskConfigView | null>(null);
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
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

        {/* Filtros Avançados */}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-3">
          <div>
            <label htmlFor="filter-search" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Pesquisar
            </label>
            <input
              id="filter-search"
              type="text"
              placeholder="ID, título, cliente ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status SNDesk
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
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
            <label htmlFor="filter-state" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Estado do Teste
            </label>
            <select
              id="filter-state"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
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
        isEmpty={!isLoading && filteredTickets.length === 0}
        emptyState={
          tickets.length === 0 ? (
            <EmptyState
              title="Nenhuma pendencia encontrada"
              description="Quando o SNDesk enviar um status configurado para teste, a pendencia aparecera aqui."
            />
          ) : (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <p className="text-sm font-semibold text-slate-600">
                Nenhuma pendência corresponde aos filtros aplicados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStatus("");
                  setSelectedState("");
                }}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Limpar todos os filtros
              </button>
            </div>
          )
        }
      >
        {paginatedTickets.map((ticket) => (
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

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between mt-2">
            <span className="text-xs font-semibold text-slate-500">
              Pagina {currentPage} de {totalPages} ({filteredTickets.length} chamados)
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1.5 text-xs"
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    disabled={isLoading}
                    className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      page === currentPage
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <Button
                variant="secondary"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="px-3 py-1.5 text-xs"
              >
                Proxima
              </Button>
            </div>
          </div>
        )}
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
