"use client";

import React, { useState } from "react";
import { TestStepData, STEP_STATUS_OPTIONS } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";

interface StepRowProps {
  step: TestStepData;
  onDelete: (id: string) => void;
  onUpdate: (updatedStep: TestStepData) => void;
  canEdit?: boolean;
}

export default function StepRow({
  step,
  onDelete,
  onUpdate,
  canEdit = true,
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
      <tr className="border-b border-gray-100 bg-brand-50/10">
        <td className="p-4 align-top text-center text-sm font-mono text-gray-500 font-medium">
          {step.stepNumber}
        </td>
        <td className="p-4 align-top" colSpan={4}>
          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Ação
              </label>
              <textarea
                rows={3}
                className="input"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Resultado Esperado
              </label>
              <textarea
                rows={3}
                className="input"
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Resultado Obtido
              </label>
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
              <label className="text-xs font-semibold text-gray-500">
                Status:
              </label>
              <select
                className="input py-1 px-2 text-xs max-w-[150px]"
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

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      <td className="p-4 text-center text-sm font-mono text-gray-500 font-medium">
        {step.stepNumber}
      </td>
      <td className="p-4 text-sm text-gray-800 break-words whitespace-pre-line max-w-[240px]">
        {step.action}
      </td>
      <td className="p-4 text-sm text-gray-600 break-words whitespace-pre-line max-w-[240px]">
        {step.expectedResult}
      </td>
      <td className="p-4 text-sm text-gray-600 break-words whitespace-pre-line max-w-[240px]">
        {step.actualResult}
      </td>
      <td className="p-4 whitespace-nowrap">
        <StatusBadge status={step.status} size="sm" />
      </td>
      <td className="p-4 whitespace-nowrap text-right text-xs">
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
        </div> : <span className="font-medium text-slate-400">Somente leitura</span>}
      </td>
    </tr>
  );
}
