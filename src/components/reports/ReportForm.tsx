"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BRANCH_OPTIONS,
  TEST_TYPE_OPTIONS,
  GENERAL_STATUS_OPTIONS,
  STEP_STATUS_OPTIONS,
  TestReportData,
  TestStepData,
} from "@/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import MultiSelectCreatable from "@/components/ui/MultiSelectCreatable";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import StatusBadge, { getStatusColorVar } from "@/components/ui/StatusBadge";
import { AI_INPUT_MAX_CHARS } from "@/lib/ai/schemas";
import { useAuthUser } from "@/components/auth/AuthProvider";

interface ReportFormProps {
  initialData?: Partial<TestReportData>;
  onSubmit: (data: Omit<TestReportData, "id" | "code" | "createdAt" | "updatedAt">) => void;
  isLoading: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ReportForm({
  initialData,
  onSubmit,
  isLoading,
}: ReportFormProps) {
  const isCreate = !initialData?.id;
  const currentUser = useAuthUser();
  const isQaUser = currentUser?.role === "QA";

  // Inicialização do estado do relatório
  const [testDate, setTestDate] = useState("");
  const [systemName, setSystemName] = useState("");
  const [branch, setBranch] = useState("");
  const [screenPath, setScreenPath] = useState("");
  const [functionality, setFunctionality] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [testType, setTestType] = useState("");
  const [generalStatus, setGeneralStatus] = useState("");
  const [testerId, setTesterId] = useState("");
  const [sndeskTechnicianName, setSndeskTechnicianName] = useState("");
  const [notes, setNotes] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);



  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado dos passos dinâmicos (apenas criação)
  const [steps, setSteps] = useState<Omit<TestStepData, "id" | "reportId">[]>([]);
  const [newStepAction, setNewStepAction] = useState("");
  const [newStepExpected, setNewStepExpected] = useState("");
  const [newStepActual, setNewStepActual] = useState("");
  const [newStepStatus, setNewStepStatus] = useState("Aprovado QA");
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Estados da IA
  const [aiInputText, setAiInputText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const aiInputLength = aiInputText.trim().length;
  const isAiInputTooLong = aiInputLength > AI_INPUT_MAX_CHARS;

  const handleAiGenerate = async () => {
    if (!aiInputText.trim()) {
      setAiError("Por favor, descreva o teste ou bug antes de gerar.");
      return;
    }

    if (isAiInputTooLong) {
      setAiError(
        `O relato tem ${aiInputLength.toLocaleString("pt-BR")} caracteres. Reduza para no maximo ${AI_INPUT_MAX_CHARS.toLocaleString("pt-BR")} caracteres antes de enviar.`
      );
      return;
    }

    setIsAiGenerating(true);
    setAiError("");
    setAiSuccessMessage("");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "report", text: aiInputText }),
      });

      const result = await response
        .json()
        .catch(() => ({
          error:
            "O assistente demorou mais que o esperado ou retornou uma resposta invalida. Tente resumir o texto e gerar novamente.",
        }));

      if (!response.ok) {
        throw new Error(
          result.details || result.error || "Erro ao processar com o assistente."
        );
      }

      const data = result.data;

      // Preencher os campos do formulário com o JSON gerado
      if (data.systemName) setSystemName(data.systemName);
      if (data.branch) setBranch(data.branch);
      if (data.testType) setTestType(data.testType);
      if (data.generalStatus) setGeneralStatus(data.generalStatus);
      if (data.screenPath) setScreenPath(data.screenPath);
      if (data.functionality) setFunctionality(data.functionality);
      if (data.bugDescription) setBugDescription(data.bugDescription);
      if (data.notes) setNotes(data.notes);

      // Preencher data de teste com a data de hoje, caso não haja
      if (!testDate) {
        const today = new Date().toISOString().split("T")[0];
        setTestDate(today);
      }

      // Preencher passos
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(
          data.steps.map((s: any) => ({
            stepNumber: s.stepNumber,
            action: s.action || "",
            expectedResult: s.expectedResult || "",
            actualResult: s.actualResult || "",
            status: s.status || "Não Executado",
          }))
        );
      }

      setAiSuccessMessage(
        result.meta?.fallbackUsed
          ? "Formulário preenchido com sucesso com o Assistente! Revise os dados antes de salvar." : "Formulário preenchido com sucesso com o Assistente! Revise os dados antes de salvar."
      );
      setAiInputText("");
    } catch (err: any) {
      setAiError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      if (initialData.testDate) {
        // Formatar data para YYYY-MM-DD para input date
        const d = new Date(initialData.testDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setTestDate(`${year}-${month}-${day}`);
      }
      setSystemName(initialData.systemName || "");
      setBranch(initialData.branch || "");
      setScreenPath(initialData.screenPath || "");
      setFunctionality(initialData.functionality || "");
      setBugDescription(initialData.bugDescription || "");
      setTestType(initialData.testType || "");
      setGeneralStatus(initialData.generalStatus || "");
      setTesterId(initialData.testerId || "");
      setSndeskTechnicianName(initialData.sndeskTechnicianName || "");
      setNotes(initialData.notes || "");
    }
  }, [initialData]);

  useEffect(() => {
    let isMounted = true;

    async function loadUserOptions() {
      try {
        const response = await fetch("/api/users/options", { cache: "no-store" });
        const result = await response.json();

        if (isMounted && response.ok && result.success) {
          setUserOptions(result.data);
        }
      } catch {
        if (isMounted) setUserOptions([]);
      }
    }

    loadUserOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!testDate) {
      newErrors.testDate = "Data do teste é obrigatória.";
    } else {
      const selected = new Date(testDate + "T12:00:00");
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selected > today) {
        newErrors.testDate = "A data do teste não pode ser uma data futura.";
      }
    }
    if (!systemName.trim()) newErrors.systemName = "Nome do sistema é obrigatório.";
    if (!branch) newErrors.branch = "Branch é obrigatória.";
    if (!screenPath.trim()) newErrors.screenPath = "Caminho da tela é obrigatório.";
    if (!functionality.trim()) newErrors.functionality = "Funcionalidade é obrigatória.";
    if (!bugDescription.trim()) newErrors.bugDescription = "Descrição do bug é obrigatória.";
    if (!testType) newErrors.testType = "Tipo do teste é obrigatório.";
    if (!generalStatus) newErrors.generalStatus = "Status geral é obrigatório.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      testDate: new Date(testDate + "T12:00:00"),
      systemName,
      branch,
      screenPath,
      functionality,
      bugDescription,
      testType,
      generalStatus: generalStatus as any,
      testerId: isQaUser ? currentUser?.id || null : testerId || null,
      sndeskTechnicianName: sndeskTechnicianName.trim() || null,
      notes: notes || null,
      steps: isCreate ? steps : undefined,
    });
  };

  // Funções de manipulação de passos locais
  const validateStep = () => {
    const errs: Record<string, string> = {};
    if (!newStepAction.trim()) errs.action = "Ação é obrigatória.";
    if (!newStepExpected.trim()) errs.expectedResult = "Resultado esperado é obrigatório.";
    if (!newStepActual.trim()) errs.actualResult = "Resultado obtido é obrigatório.";
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetStepForm = () => {
    setNewStepAction("");
    setNewStepExpected("");
    setNewStepActual("");
    setNewStepStatus("Aprovado QA");
    setStepErrors({});
  };

  const openAddStep = () => {
    resetStepForm();
    setEditingStepIndex(null);
    setIsAddingStep(true);
  };

  const openEditStep = (index: number) => {
    const step = steps[index];
    setNewStepAction(step.action);
    setNewStepExpected(step.expectedResult);
    setNewStepActual(step.actualResult);
    setNewStepStatus(step.status);
    setStepErrors({});
    setEditingStepIndex(index);
    setIsAddingStep(true);
  };

  const closeStepForm = () => {
    resetStepForm();
    setEditingStepIndex(null);
    setIsAddingStep(false);
  };

  const handleSaveStep = () => {
    if (!validateStep()) return;

    if (editingStepIndex !== null) {
      const updated = [...steps];
      updated[editingStepIndex] = {
        ...updated[editingStepIndex],
        action: newStepAction.trim(),
        expectedResult: newStepExpected.trim(),
        actualResult: newStepActual.trim(),
        status: newStepStatus as any,
      };
      setSteps(updated);
    } else {
      const nextNum = steps.length + 1;
      const stepToAdd = {
        stepNumber: nextNum,
        action: newStepAction.trim(),
        expectedResult: newStepExpected.trim(),
        actualResult: newStepActual.trim(),
        status: newStepStatus as any,
      };
      setSteps([...steps, stepToAdd]);
    }

    closeStepForm();
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    // Reordenar numeração sequencial
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
    if (editingStepIndex === index) {
      closeStepForm();
    }
  };

  const requiredFieldValues = [
    testDate,
    systemName,
    branch,
    testType,
    generalStatus,
    screenPath,
    functionality,
    bugDescription,
  ];
  const filledRequiredCount = requiredFieldValues.filter((v) => Boolean(v && v.trim())).length;
  const showNotes = isNotesOpen || Boolean(notes.trim());

  const renderStepForm = (asEditRow: boolean) => (
    <div
      className={
        asEditRow
          ? "space-y-4 border-t border-hairline bg-panel2 p-4"
          : "space-y-4 rounded-[14px] border border-line bg-panel2 p-4"
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-accent">
          {editingStepIndex !== null ? `Editar passo #${editingStepIndex + 1}` : `Novo passo #${steps.length + 1}`}
        </span>
        <button
          type="button"
          onClick={closeStepForm}
          className="text-[12px] font-semibold text-muted transition-colors hover:text-fg2"
        >
          ✕ fechar
        </button>
      </div>

      <Input
        label="Ação / Descrição *"
        id="newAction"
        placeholder="Ex: Acessar página de login e clicar em Esqueci minha senha"
        value={newStepAction}
        onChange={(e) => setNewStepAction(e.target.value)}
        error={stepErrors.action}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Textarea
          label="Resultado Esperado *"
          id="newExpected"
          rows={2}
          placeholder="Ex: Sistema deve exibir input para digitar o e-mail cadastrado"
          value={newStepExpected}
          onChange={(e) => setNewStepExpected(e.target.value)}
          error={stepErrors.expectedResult}
        />
        <Textarea
          label="Resultado Obtido / Atual *"
          id="newActual"
          rows={2}
          placeholder="Ex: Exibiu a caixa de digitação corretamente"
          value={newStepActual}
          onChange={(e) => setNewStepActual(e.target.value)}
          error={stepErrors.actualResult}
        />
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-[220px]">
          <Select
            label="Status *"
            id="newStatus"
            value={newStepStatus}
            onChange={(e) => setNewStepStatus(e.target.value)}
            options={STEP_STATUS_OPTIONS}
          />
        </div>
        <Button type="button" onClick={handleSaveStep} className="w-full sm:w-auto">
          {editingStepIndex !== null ? "Salvar alterações" : "Adicionar passo à lista"}
        </Button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6 pb-4">
      {initialData?.code && (
        <div className="w-full rounded-[14px] border border-line bg-panel2 p-4 sm:max-w-[220px]">
          <span className="label mb-1">Código do Relatório</span>
          <span className="block rounded-[8px] bg-panel px-2 py-1.5 text-center font-mono text-[13px] font-bold text-fg">
            {initialData.code}
          </span>
        </div>
      )}

      {/* Indicador de progresso */}
      {isCreate && (
        <div className="flex items-center justify-end gap-3">
          <div className="h-[5px] w-[120px] overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(filledRequiredCount / requiredFieldValues.length) * 100}%` }}
            />
          </div>
          <span className="whitespace-nowrap font-mono text-[11px] text-muted">
            {filledRequiredCount} de {requiredFieldValues.length} campos
          </span>
        </div>
      )}

      {/* Assistente de IA (recolhido por padrão) */}
      {isCreate && (
        <div className="overflow-hidden rounded-[14px] border border-accent/35 bg-[linear-gradient(180deg,rgb(var(--panel-2)),rgb(var(--panel)))]">
          <button
            type="button"
            onClick={() => setIsAiPanelOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left sm:px-5"
          >
            <span className="text-[15px]">✨</span>
            <span className="text-[13px] font-bold text-fg">Preencher com o assistente de IA</span>
            <span className="hidden text-[12px] font-medium text-muted sm:inline">
              — cole o relato do teste e ele estrutura o formulário
            </span>
            <svg
              className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted transition-transform ${isAiPanelOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`grid transition-all duration-200 ${isAiPanelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
              <div className="space-y-4 border-t border-accent/20 px-4 pb-4 pt-4 sm:px-5">
                <p className="text-[12px] font-semibold leading-relaxed text-muted">
                  Descreva os testes que você realizou. Nosso Assistente irá estruturar todo o formulário para sua verificação.
                </p>
                <Textarea
                  placeholder="Ex: Fui testar o SNDesk na branch Alfa e achei um bug na tela de Novo Chamado.  Quando cliquei para criar o chamado deu erro 500."
                  id="aiTextRelato"
                  rows={4}
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  maxLength={AI_INPUT_MAX_CHARS + 1000}
                  className={isAiInputTooLong ? "border-bad focus:border-bad focus:ring-bad/16" : ""}
                />
                <div className="flex flex-col gap-1 text-[12px] sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted">
                    Textos muito longos podem demorar mais. Se possivel, cole apenas o relato principal do bug/teste.
                  </span>
                  <span className={`font-bold ${isAiInputTooLong ? "text-bad" : "text-muted"}`}>
                    {aiInputLength.toLocaleString("pt-BR")} / {AI_INPUT_MAX_CHARS.toLocaleString("pt-BR")}
                  </span>
                </div>
                {aiError && (
                  <div className="rounded-[9px] border border-bad/30 bg-bad/8 p-3 text-[12px] font-medium text-bad">
                    {aiError}
                  </div>
                )}
                <div className="flex justify-stretch sm:justify-end">
                  <Button
                    type="button"
                    onClick={handleAiGenerate}
                    isLoading={isAiGenerating}
                    disabled={isAiGenerating || isAiInputTooLong}
                    variant="primary"
                    className="w-full px-4 py-1.5 text-xs sm:w-auto"
                  >
                    Gerar Estrutura de Teste
                  </Button>
                </div>
                {aiSuccessMessage && (
                  <div className="flex items-start gap-2 rounded-[9px] border border-ok/30 bg-ok/8 p-3.5 text-[12px] font-semibold text-ok">
                    <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{aiSuccessMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção 1: Sobre o teste */}
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-hairline pb-3">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent">
            1
          </div>
          <h3 className="text-[13px] font-bold text-fg">Sobre o teste</h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Data do Teste *"
            id="testDate"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            error={errors.testDate}
          />

          <Input
            label="Nome do Sistema *"
            id="systemName"
            type="text"
            placeholder="Ex: SNDesk, Financeiro"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            error={errors.systemName}
          />

          <MultiSelectCreatable
            label="Branch / Ambiente *"
            id="branch"
            placeholder="Selecione ou digite a branch..."
            options={BRANCH_OPTIONS}
            value={branch}
            onChange={setBranch}
            error={errors.branch}
          />

          <Select
            label="Tipo do Teste *"
            id="testType"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            options={TEST_TYPE_OPTIONS}
            error={errors.testType}
          />

          <Select
            label="Status Geral *"
            id="generalStatus"
            value={generalStatus}
            onChange={(e) => setGeneralStatus(e.target.value)}
            options={GENERAL_STATUS_OPTIONS}
            error={errors.generalStatus}
          />

          {isQaUser ? (
            <Input
              label="QA"
              id="testerName"
              value={currentUser?.name || "Usuario atual"}
              disabled
            />
          ) : (
            <Select
              label="QA"
              id="testerId"
              value={testerId}
              onChange={(e) => setTesterId(e.target.value)}
            >
              <option value="">Selecione o QA</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.role})
                </option>
              ))}
            </Select>
          )}

          <Input
            label="Dev responsavel"
            id="sndeskTechnicianName"
            placeholder="Nome do dev/técnico do SNDesk"
            value={sndeskTechnicianName}
            onChange={(e) => setSndeskTechnicianName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Caminho da Tela / Menu *"
            id="screenPath"
            placeholder="Ex: Menu Rápido > Configurações > Minha Empresa"
            value={screenPath}
            onChange={(e) => setScreenPath(e.target.value)}
            error={errors.screenPath}
          />

          <Input
            label="Funcionalidade *"
            id="functionality"
            placeholder="Ex: Edição de horário de funcionamento"
            value={functionality}
            onChange={(e) => setFunctionality(e.target.value)}
            error={errors.functionality}
          />
        </div>

        <Textarea
          label="Descrição do Bug / Cenário *"
          id="bugDescription"
          rows={4}
          placeholder="Descreva o comportamento incorreto observado ou o cenário validado de forma detalhada..."
          value={bugDescription}
          onChange={(e) => setBugDescription(e.target.value)}
          error={errors.bugDescription}
        />

        {showNotes ? (
          <Textarea
            label="Observações / Notas Adicionais"
            id="notes"
            rows={3}
            placeholder="Notas sobre credenciais utilizadas, links úteis, dependências..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsNotesOpen(true)}
            className="self-start text-[12px] font-bold text-accent transition-colors hover:opacity-80"
          >
            + Observações (opcional)
          </button>
        )}
      </div>

      {/* Seção 2: Passos de Teste (Apenas na Criação) */}
      {isCreate && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-hairline px-4 py-3.5 sm:px-5">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent">
              2
            </div>
            <h3 className="text-[13px] font-bold text-fg">Passos do teste</h3>
            <span className="font-mono text-[10.5px] text-faint">
              {steps.length} adicionado{steps.length === 1 ? "" : "s"}
            </span>
            {!isAddingStep && (
              <button
                type="button"
                onClick={openAddStep}
                className="ml-auto inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-panel2 px-3 py-1.5 text-[12px] font-bold text-fg transition-colors hover:bg-panel"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar passo
              </button>
            )}
          </div>

          {steps.length === 0 && !isAddingStep && (
            <div className="p-6 text-center text-[12px] font-semibold text-faint">
              Nenhum passo de teste adicionado ainda. Clique em "Adicionar passo" para incluir o primeiro.
            </div>
          )}

          {steps.map((step, index) =>
            editingStepIndex === index ? (
              <div key={index}>{renderStepForm(true)}</div>
            ) : (
              <div
                key={index}
                style={{ borderLeft: `3px solid ${getStatusColorVar(step.status)}` }}
                className="flex items-center gap-3 border-t border-hairline px-4 py-3 first:border-t-0 sm:px-5"
              >
                <span className="font-mono text-[12px] font-bold text-faint">
                  {String(step.stepNumber).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{step.action}</span>
                <StatusBadge status={step.status} size="sm" />
                <span className="flex shrink-0 items-center gap-2 font-mono text-[12px] text-faint">
                  <button
                    type="button"
                    onClick={() => openEditStep(index)}
                    className="transition-colors hover:text-fg2"
                  >
                    editar
                  </button>
                  ·
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="transition-colors hover:text-bad"
                    title="Remover passo"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )
          )}

          {isAddingStep && editingStepIndex === null && renderStepForm(true)}
        </div>
      )}

      {/* Ações do Form */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-3 border-t border-hairline bg-surface px-4 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 [&>div>*]:w-full sm:[&>div>*]:w-auto">
        <span className="text-[12px] font-medium text-muted">Rascunho salvo automaticamente</span>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Link href="/reports" passHref legacyBehavior>
            <Button variant="secondary" disabled={isLoading}>
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isCreate ? "Salvar Relatório de Teste" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </form>
  );
}
