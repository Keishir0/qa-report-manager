"use client";

import React, { useState } from "react";
import { STEP_STATUS_OPTIONS } from "@/types";

interface StepFormProps {
  reportId: string;
  stepNumber: number;
  existingStepNumbers?: number[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StepForm({
  reportId,
  stepNumber,
  existingStepNumbers = [],
  onSuccess,
  onCancel,
}: StepFormProps) {
  const [num, setNum] = useState<number | "">(stepNumber);
  const [action, setAction] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [status, setStatus] = useState("Aprovado QA");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (num === "" || isNaN(Number(num))) {
      errors.stepNumber = "Número do passo é obrigatório.";
    } else if (Number(num) <= 0) {
      errors.stepNumber = "O número do passo deve ser maior que zero.";
    } else if (existingStepNumbers.includes(Number(num))) {
      errors.stepNumber = "Este número de passo já existe no relatório.";
    }

    if (!action.trim()) errors.action = "Ação é obrigatória.";
    if (!expectedResult.trim()) errors.expectedResult = "Resultado esperado é obrigatório.";
    if (!actualResult.trim()) errors.actualResult = "Resultado obtido é obrigatório.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/steps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          stepNumber: Number(num),
          action,
          expectedResult,
          actualResult,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Ocorreu um erro ao criar o passo.");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erro de rede.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-[14px] border-2 border-dashed border-line bg-panel2 p-4 sm:p-5"
    >
      <div className="mb-2 flex items-center justify-between border-b border-hairline pb-2">
        <h4 className="text-[13px] font-semibold text-fg">
          Adicionar Passo #{num}
        </h4>
        <span className="text-[12px] text-muted">Novo Passo</span>
      </div>

      {error && (
        <div className="rounded-[9px] border border-bad/30 bg-bad/8 p-3 text-[12px] text-bad">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nº do Passo */}
        <div>
          <label className="label" htmlFor="stepNumberInput">
            Nº do Passo <span className="text-bad">*</span>
          </label>
          <input
            type="number"
            id="stepNumberInput"
            min={1}
            className={`input ${validationErrors.stepNumber ? "border-bad" : ""}`}
            placeholder="Ex: 1"
            value={num}
            onChange={(e) => setNum(e.target.value === "" ? "" : Number(e.target.value))}
          />
          {validationErrors.stepNumber && (
            <p className="mt-1 text-xs text-bad">
              {validationErrors.stepNumber}
            </p>
          )}
        </div>

        {/* Status do Passo */}
        <div>
          <label className="label" htmlFor="stepStatus">
            Status do Passo <span className="text-bad">*</span>
          </label>
          <select
            id="stepStatus"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STEP_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Ação */}
        <div className="md:col-span-2">
          <label className="label" htmlFor="stepAction">
            Ação / Passo <span className="text-bad">*</span>
          </label>
          <textarea
            id="stepAction"
            rows={2}
            className={`input ${validationErrors.action ? "border-bad" : ""}`}
            placeholder="Descreva a ação a ser executada no teste (Ex: Acessar página de login)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          {validationErrors.action && (
            <p className="mt-1 text-xs text-bad">
              {validationErrors.action}
            </p>
          )}
        </div>

        {/* Resultado Esperado */}
        <div>
          <label className="label" htmlFor="stepExpected">
            Resultado Esperado <span className="text-bad">*</span>
          </label>
          <textarea
            id="stepExpected"
            rows={2}
            className={`input ${
              validationErrors.expectedResult ? "border-bad" : ""
            }`}
            placeholder="Descreva o resultado esperado (Ex: Tela de login exibida)"
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
          />
          {validationErrors.expectedResult && (
            <p className="mt-1 text-xs text-bad">
              {validationErrors.expectedResult}
            </p>
          )}
        </div>

        {/* Resultado Obtido */}
        <div>
          <label className="label" htmlFor="stepActual">
            Resultado Obtido / Atual <span className="text-bad">*</span>
          </label>
          <textarea
            id="stepActual"
            rows={2}
            className={`input ${
              validationErrors.actualResult ? "border-bad" : ""
            }`}
            placeholder="Descreva o resultado realmente obtido (Ex: Tela aberta corretamente)"
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
          />
          {validationErrors.actualResult && (
            <p className="mt-1 text-xs text-bad">
              {validationErrors.actualResult}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-hairline pt-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isLoading}
          onClick={onCancel}
          className="btn-secondary w-full sm:w-auto"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full min-w-[100px] sm:w-auto"
        >
          {isLoading ? "Salvando..." : "Salvar Passo"}
        </button>
      </div>
    </form>
  );
}
