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
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

interface ReportFormProps {
  initialData?: Partial<TestReportData>;
  onSubmit: (data: Omit<TestReportData, "id" | "code" | "createdAt" | "updatedAt">) => void;
  isLoading: boolean;
}

export default function ReportForm({
  initialData,
  onSubmit,
  isLoading,
}: ReportFormProps) {
  const isCreate = !initialData?.id;

  // Inicialização do estado do relatório
  const [testDate, setTestDate] = useState("");
  const [systemName, setSystemName] = useState("");
  const [branch, setBranch] = useState("");
  const [screenPath, setScreenPath] = useState("");
  const [functionality, setFunctionality] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [testType, setTestType] = useState("");
  const [generalStatus, setGeneralStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado dos passos dinâmicos (apenas criação)
  const [steps, setSteps] = useState<Omit<TestStepData, "id" | "reportId">[]>([]);
  const [newStepAction, setNewStepAction] = useState("");
  const [newStepExpected, setNewStepExpected] = useState("");
  const [newStepActual, setNewStepActual] = useState("");
  const [newStepStatus, setNewStepStatus] = useState("Passou");
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Estados da IA
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");

  const handleAiGenerate = async () => {
    if (!aiInputText.trim()) {
      setAiError("Por favor, descreva o teste ou bug antes de gerar.");
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
        body: JSON.stringify({ text: aiInputText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Erro ao processar com IA."
        );
      }

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
            status: s.status || "Passou",
          }))
        );
      }

      setAiSuccessMessage("✨ Formulário preenchido por IA com sucesso! Por favor, revise todos os campos e passos abaixo antes de salvar.");
      setIsAiPanelOpen(false);
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
      setNotes(initialData.notes || "");
    }
  }, [initialData]);

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
    setNewStepStatus("Passou");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialData?.code && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-[220px]">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Código do Relatório
          </span>
          <span className="font-mono text-sm font-bold text-slate-700 bg-slate-200/50 px-2 py-1.5 rounded-lg block text-center">
            {initialData.code}
          </span>
        </div>
      )}

      {/* Assistente de IA */}
      {isCreate && (
        <div className="border border-indigo-200 rounded-xl p-5 bg-indigo-50/20 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="font-extrabold text-indigo-900 text-sm">Preenchimento Inteligente com IA</h3>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAiPanelOpen(!isAiPanelOpen);
                setAiError("");
                setAiSuccessMessage("");
              }}
              className="text-xs py-1.5 px-3"
            >
              {isAiPanelOpen ? "Fechar Painel" : "Abrir Assistente"}
            </Button>
          </div>

          {isAiPanelOpen ? (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-indigo-700 font-semibold leading-relaxed">
                Descreva informalmente em linguagem natural o que aconteceu, qual sistema foi testado, qual branch,
                e os passos que você seguiu. Nossa IA irá estruturar todo o formulário (incluindo a tabela de passos)
                para sua verificação.
              </p>
              <Textarea
                placeholder="Ex: Fui testar o SNDesk na branch Alfa e achei um bug na tela de Cupom. Quando eu pus o cupom 'PROMO2026' na finalização da compra, a tela travou em branco e deu erro 500 no console. Esperava que desse mensagem amigável de cupom inválido. Passos: loguei, fui no carrinho, pus o cupom PROMO2026 e cliquei em aplicar..."
                id="aiTextRelato"
                rows={4}
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20"
              />
              {aiError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-100 font-medium">
                  {aiError}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleAiGenerate}
                  isLoading={isAiGenerating}
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5 px-4"
                >
                  Gerar Estrutura de Teste
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              Cole seu relato informal de bug/teste em linguagem natural e deixe que a IA preencha as seções e os passos sequenciais para você.
            </p>
          )}

          {aiSuccessMessage && (
            <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-lg border border-emerald-200 font-semibold animate-fade-in flex items-start gap-2">
              <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{aiSuccessMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Seção 1: Identificação */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
            1
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Identificação do Teste</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

          <Select
            label="Branch / Ambiente *"
            id="branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            options={BRANCH_OPTIONS}
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
        </div>
      </div>

      {/* Seção 2: Localização do Teste */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
            2
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Localização do Teste</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
      </div>

      {/* Seção 3: Bug ou Cenário */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
            3
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm">Bug ou Cenário Testado</h3>
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

      {/* Seção 4: Passos Dinâmicos (Apenas na Criação) */}
      {isCreate && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Passos de Teste Adicionados ({steps.length})</h3>
          </div>

          {/* Tabela de Passos Locais */}
          {steps.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                    <th className="p-3 w-16 text-center">Nº</th>
                    <th className="p-3">Ação</th>
                    <th className="p-3">Resultado Esperado</th>
                    <th className="p-3">Resultado Obtido</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 w-44 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {steps.map((step, index) => (
                    <tr key={index} className="hover:bg-slate-50/40">
                      <td className="p-3 text-center font-mono font-bold text-slate-400">
                        {step.stepNumber}
                      </td>
                      <td className="p-3 break-words whitespace-pre-line max-w-[200px]">
                        {step.action}
                      </td>
                      <td className="p-3 break-words whitespace-pre-line max-w-[200px]">
                        {step.expectedResult}
                      </td>
                      <td className="p-3 break-words whitespace-pre-line max-w-[200px]">
                        {step.actualResult}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={step.status} size="sm" />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
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
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                            title="Mover para baixo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(index)}
                            className="p-1.5 text-red-500 hover:text-red-700 transition-colors"
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
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
              Nenhum passo de teste adicionado ainda. Preencha os campos abaixo para adicionar o primeiro passo.
            </div>
          )}

          {/* Form Integrado para Adicionar Passo */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs text-slate-700">
                Novo Passo #{steps.length + 1}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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

            <div className="flex justify-end pt-1">
              <Button type="button" variant="secondary" onClick={handleAddStep}>
                Adicionar Passo à Lista
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ações do Form */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
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

