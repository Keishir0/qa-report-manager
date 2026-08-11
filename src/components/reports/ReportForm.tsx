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

  // Estados da IA
  const [aiInputText, setAiInputText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
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

  const handleAddStep = () => {
    if (!validateStep()) return;
    const nextNum = steps.length + 1;
    const stepToAdd = {
      stepNumber: nextNum,
      action: newStepAction.trim(),
      expectedResult: newStepExpected.trim(),
      actualResult: newStepActual.trim(),
      status: newStepStatus as any,
    };
    setSteps([...steps, stepToAdd]);

    // Limpar campos
    setNewStepAction("");
    setNewStepExpected("");
    setNewStepActual("");
    setNewStepStatus("Aprovado QA");
    setStepErrors({});
  };

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, idx) => idx !== index);
    // Reordenar numeração sequencial
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const moveDown = (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      {initialData?.code && (
        <div className="w-full rounded-[14px] border border-line bg-panel2 p-4 sm:max-w-[220px]">
          <span className="label mb-1">Código do Relatório</span>
          <span className="block rounded-[8px] bg-panel px-2 py-1.5 text-center font-mono text-[13px] font-bold text-fg">
            {initialData.code}
          </span>
        </div>
      )}

      {/* Assistente de IA */}
      {isCreate && (
        <div className="space-y-4 rounded-[14px] border border-accent/35 bg-[linear-gradient(180deg,rgb(var(--panel-2)),rgb(var(--panel)))] p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-accent/20 pb-3">
            <span className="text-[16px]">✨</span>
            <h3 className="text-[13px] font-bold text-fg">Preenchimento inteligente com o Assistente</h3>
          </div>

          <div className="space-y-4">
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
      )}

      {/* Seção 1: Identificação */}
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-hairline pb-3">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent">
            1
          </div>
          <h3 className="text-[13px] font-bold text-fg">Identificação do Teste</h3>
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
      </div>

      {/* Seção 2: Localização e cenário */}
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-hairline pb-3">
          <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent">
            2
          </div>
          <h3 className="text-[13px] font-bold text-fg">Localização e cenário</h3>
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

        <div className="space-y-4">
          <Textarea
            label="Descrição do Bug / Cenário *"
            id="bugDescription"
            rows={4}
            placeholder="Descreva o comportamento incorreto observado ou o cenário validado de forma detalhada..."
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            error={errors.bugDescription}
          />

          <Textarea
            label="Observações / Notas Adicionais"
            id="notes"
            rows={3}
            placeholder="Notas sobre credenciais utilizadas, links úteis, dependências..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Seção 3: Passos Dinâmicos (Apenas na Criação) */}
      {isCreate && (
        <div className="card space-y-6 p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-hairline pb-3">
            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-bold text-accent">
              3
            </div>
            <h3 className="text-[13px] font-bold text-fg">Passos de Teste Adicionados ({steps.length})</h3>
          </div>

          {/* Tabela de Passos Locais */}
          {steps.length > 0 ? (
            <div className="overflow-x-auto overscroll-x-contain rounded-[10px] border border-line bg-panel2 max-lg:overflow-visible max-lg:border-0 max-lg:bg-transparent">
              <table className="w-full min-w-[860px] text-left border-collapse max-lg:block max-lg:min-w-0">
                <thead className="max-lg:hidden">
                  <tr className="border-b border-line text-faint">
                    <th className="w-16 p-3 text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Nº</th>
                    <th className="p-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Ação</th>
                    <th className="p-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Resultado Esperado</th>
                    <th className="p-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Resultado Obtido</th>
                    <th className="w-32 p-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Status</th>
                    <th className="w-44 p-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-fg2 max-lg:block max-lg:space-y-3">
                  {steps.map((step, index) => (
                    <tr
                      key={index}
                      style={{ borderLeft: `3px solid ${getStatusColorVar(step.status)}` }}
                      className="border-t border-hairline hover:bg-panel max-lg:block max-lg:rounded-[14px] max-lg:border max-lg:border-line max-lg:bg-panel"
                    >
                      <td data-label="Nº" className="p-3 text-center font-mono font-bold text-faint max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        {step.stepNumber}
                      </td>
                      <td data-label="Acao" className="max-w-[200px] whitespace-pre-line break-words p-3 max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        {step.action}
                      </td>
                      <td data-label="Resultado Esperado" className="max-w-[200px] whitespace-pre-line break-words p-3 max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        {step.expectedResult}
                      </td>
                      <td data-label="Resultado Obtido" className="max-w-[200px] whitespace-pre-line break-words p-3 max-lg:flex max-lg:max-w-none max-lg:items-start max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        {step.actualResult}
                      </td>
                      <td data-label="Status" className="p-3 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-hairline max-lg:text-right max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        <StatusBadge status={step.status} size="sm" />
                      </td>
                      <td data-label="Acoes" className="p-3 text-right max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:before:text-left max-lg:before:font-mono max-lg:before:text-[10px] max-lg:before:font-medium max-lg:before:uppercase max-lg:before:tracking-[0.12em] max-lg:before:text-faint max-lg:before:content-[attr(data-label)]">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 text-faint transition-colors hover:text-fg2 disabled:opacity-30"
                            title="Mover para cima"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={index === steps.length - 1}
                            className="p-1.5 text-faint transition-colors hover:text-fg2 disabled:opacity-30"
                            title="Mover para baixo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            className="p-1.5 text-bad transition-colors hover:opacity-80"
                            title="Remover passo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-[14px] border-2 border-dashed border-line p-6 text-center text-[12px] font-semibold text-faint">
              Nenhum passo de teste adicionado ainda. Preencha os campos abaixo para adicionar o primeiro passo.
            </div>
          )}

          {/* Form Integrado para Adicionar Passo */}
          <div className="space-y-4 rounded-[14px] border border-line bg-panel2 p-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <span className="text-[12px] font-bold text-fg">
                Novo Passo #{steps.length + 1}
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                Definindo passo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-3">
                <Input
                  label="Ação / Descrição *"
                  id="newAction"
                  placeholder="Ex: Acessar página de login e clicar em Esqueci minha senha"
                  value={newStepAction}
                  onChange={(e) => setNewStepAction(e.target.value)}
                  error={stepErrors.action}
                />
              </div>
              <div className="sm:col-span-1">
                <Select
                  label="Status *"
                  id="newStatus"
                  value={newStepStatus}
                  onChange={(e) => setNewStepStatus(e.target.value)}
                  options={STEP_STATUS_OPTIONS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="flex justify-stretch pt-1 sm:justify-end">
              <Button type="button" variant="secondary" onClick={handleAddStep} className="w-full sm:w-auto">
                Adicionar Passo à Lista
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ações do Form */}
      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-4 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
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
    </form>
  );
}
