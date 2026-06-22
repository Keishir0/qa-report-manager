"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface SndeskConfigView {
  baseUrl: string;
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

export default function SndeskIntegrationConfig() {
  const [config, setConfig] = useState<SndeskConfigView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    baseUrl: "",
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

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sndesk/config", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel carregar a configuracao.");
      }

      setConfig(result.data);
      setMessage(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Erro ao carregar configuracao SNDesk.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!config) return;

    setForm((current) => ({
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

  async function saveConfig() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/sndesk/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel salvar a configuracao.");
      }

      setConfig(result.data);
      setMessage({ type: "success", text: "Configuracao SNDesk salva no banco." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Erro ao salvar configuracao.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Integracao SNDesk
          </span>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Esses dados ficam salvos no banco em `webhook_settings`.
          </p>
        </div>
        <Button variant="secondary" onClick={loadConfig} isLoading={isLoading} className="px-3 py-2 text-xs">
          Recarregar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input
          id="sndesk-base-url"
          label="Dominio SNDesk"
          value={form.baseUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, baseUrl: event.target.value }))
          }
          placeholder="https://seudominio.sndesk.com.br"
        />
        <Input
          id="sndesk-default-user"
          label="Usuario padrao"
          value={form.defaultUserId}
          onChange={(event) =>
            setForm((current) => ({ ...current, defaultUserId: event.target.value }))
          }
          placeholder="1"
        />
        <Input
          id="sndesk-pending-status"
          label="Status pendentes"
          value={form.pendingStatusIds}
          onChange={(event) =>
            setForm((current) => ({ ...current, pendingStatusIds: event.target.value }))
          }
          placeholder="1,5"
        />
        <Input
          id="sndesk-approve-status"
          label="Status ao aprovar"
          value={form.approveStatusId}
          onChange={(event) =>
            setForm((current) => ({ ...current, approveStatusId: event.target.value }))
          }
          placeholder="2"
        />
        <Input
          id="sndesk-reject-status"
          label="Status ao recusar"
          value={form.rejectStatusId}
          onChange={(event) =>
            setForm((current) => ({ ...current, rejectStatusId: event.target.value }))
          }
          placeholder="1"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Textarea
          id="sndesk-approve-template"
          label="Modelo de aprovacao"
          value={form.approveTemplate}
          onChange={(event) =>
            setForm((current) => ({ ...current, approveTemplate: event.target.value }))
          }
          rows={6}
        />
        <Textarea
          id="sndesk-reject-template"
          label="Modelo de recusa"
          value={form.rejectTemplate}
          onChange={(event) =>
            setForm((current) => ({ ...current, rejectTemplate: event.target.value }))
          }
          rows={6}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.visibleClient}
              onChange={(event) =>
                setForm((current) => ({ ...current, visibleClient: event.target.checked }))
              }
            />
            Visivel ao cliente
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.emailClient}
              onChange={(event) =>
                setForm((current) => ({ ...current, emailClient: event.target.checked }))
              }
            />
            Enviar email ao cliente
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.emailTechnician}
              onChange={(event) =>
                setForm((current) => ({ ...current, emailTechnician: event.target.checked }))
              }
            />
            Enviar email ao tecnico
          </label>
        </div>
        <Button onClick={saveConfig} isLoading={isSaving}>
          Salvar configuracao
        </Button>
      </div>

      {message && (
        <p
          className={`mt-3 text-xs font-bold ${
            message.type === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
