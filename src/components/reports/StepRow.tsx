"use client";

import React, { useState } from "react";
import { TestStepData, STEP_STATUS_OPTIONS } from "@/types";
import StatusBadge, { getStatusColor, getStatusColorVar } from "@/components/ui/StatusBadge";

interface StepRowProps {
  step: TestStepData;
  onDelete: (id: string) => void;
  onUpdate: (updatedStep: TestStepData) => void;
  canEdit?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function StepRow({
  step,
  onDelete,
  onUpdate,
  canEdit = true,
  selected = false,
  onToggleSelect,
}: StepRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [action, setAction] = useState(step.action);
  const [expectedResult, setExpectedResult] = useState(step.expectedResult);
  const [actualResult, setActualResult] = useState(step.actualResult);
  const [status, setStatus] = useState(step.status);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!action.trim() || !expectedResult.trim() || !actualResult.trim()) {
      setError("Todos os campos do passo são obrigatórios.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/steps/${step.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          expectedResult,
          actualResult,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar o passo.");
      }

      const updated = await response.json();
      onUpdate(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar passo de teste.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Deseja realmente excluir este passo?")) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/steps/${step.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao excluir o passo.");
      }

      onDelete(step.id!);
    } catch (err: any) {
      setError(err.message || "Erro ao excluir passo de teste.");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setAction(step.action);
    setExpectedResult(step.expectedResult);
    setActualResult(step.actualResult);
    setStatus(step.status);
    setError("");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-panel2 max-lg:block max-lg:rounded-[14px] max-lg:border max-lg:border-line max-lg:bg-panel">
        {canEdit && (
          <td
            style={{ borderLeft: `3px solid ${getStatusColorVar(status)}` }}
            className="p-4 align-top text-center max-lg:hidden"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
              checked={selected}
              onChange={() => onToggleSelect?.(step.id!)}
            />
          </td>
        )}
        <td
          data-label="#"
          style={canEdit ? undefined : { borderLeft: `3px solid ${getStatusColorVar(status)}` }}
          className="p-4 align-top text-center font-mono text-[13px] font-medium text-faint max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]"
        >
          {step.stepNumber}
        </td>
        <td data-label="Editar passo" className="p-4 align-top max-lg:block max-lg:w-full max-lg:before:mb-3 max-lg:before:block max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]" colSpan={4}>
          {error && (
            <div className="mb-3 rounded-[8px] border border-bad/30 bg-bad/8 p-2 text-[12px] text-bad">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Ação</label>
              <textarea
                rows={3}
                className="input"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Resultado Esperado</label>
              <textarea
                rows={3}
                className="input"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Resultado Obtido</label>
              <textarea
                rows={3}
                className="input"
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[12px] font-semibold text-muted">Status:</label>
              <select
                className="input max-w-[150px] py-1 px-2 text-[12px]"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                {STEP_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="btn-secondary flex-1 px-3 py-1 text-xs sm:flex-none"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-primary min-w-[70px] flex-1 px-3 py-1 text-xs sm:flex-none"
              >
                {isLoading ? "Salvando" : "Salvar"}
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const isFailed = getStatusColor(step.status) === "bad";
  const borderAccent = { borderLeft: `3px solid ${getStatusColorVar(step.status)}` };

  return (
    <tr className="border-t border-hairline transition-colors hover:bg-panel2 max-lg:block max-lg:rounded-[14px] max-lg:border max-lg:border-line max-lg:bg-panel">
      {canEdit && (
        <td style={borderAccent} className="p-4 text-center max-lg:hidden">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
            checked={selected}
            onChange={() => onToggleSelect?.(step.id!)}
          />
        </td>
      )}
      <td
        data-label="#"
        style={canEdit ? undefined : borderAccent}
        className="p-4 text-center font-mono text-[13px] font-medium text-faint max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]"
      >
        {step.stepNumber}
      </td>
      <td data-label="Acao / Passo" className="max-w-[240px] whitespace-pre-line break-words p-4 text-[13px] text-fg2 max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
        {step.action}
      </td>
      <td data-label="Resultado Esperado" className="max-w-[240px] whitespace-pre-line break-words p-4 text-[13px] text-fg2 max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
        {step.expectedResult}
      </td>
      <td
        data-label="Resultado Obtido"
        className={`max-w-[240px] whitespace-pre-line break-words p-4 text-[13px] max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)] ${
          isFailed ? "font-semibold text-bad" : "text-fg2"
        }`}
      >
        {step.actualResult}
      </td>
      <td data-label="Status" className="whitespace-nowrap p-4 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
        <StatusBadge status={step.status} size="sm" />
      </td>
      <td data-label="Acoes" className="whitespace-nowrap p-4 text-right text-xs max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
        {canEdit ? <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary py-1 px-2.5 text-xs"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger py-1 px-2.5 text-xs"
          >
            Excluir
          </button>
        </div> : <span className="font-medium text-faint">Somente leitura</span>}
      </td>
    </tr>
  );
}
