"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReportForm from "@/components/reports/ReportForm";
import { TestReportData } from "@/types";
import Toast from "@/components/ui/Toast";
import PageHeader from "@/components/ui/PageHeader";
import { useAuthUser } from "@/components/auth/AuthProvider";

export default function NewReportPage() {
  const router = useRouter();
  const user = useAuthUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (user?.role === "VIEWER") {
      router.replace("/reports");
    }
  }, [router, user]);

  if (user?.role === "VIEWER") return null;

  const handleSubmit = async (
    formData: Omit<TestReportData, "id" | "code" | "createdAt" | "updatedAt">
  ) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Ocorreu um erro ao criar o relatório.");
      }

      const createdReport = await response.json();

      // Exibe notificação de sucesso e aguarda 1.5 segundos para redirecionar
      setToast({ message: "Relatório de teste criado com sucesso!", type: "success" });
      setTimeout(() => {
        router.push(`/reports/${createdReport.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao salvar relatório.");
      setToast({ message: err.message || "Erro ao salvar relatório.", type: "error" });
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/reports"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Voltar para lista
        </Link>
      </div>

      {/* Header */}
      <PageHeader
        title="Novo Relatório de Teste"
        description="Insira as informações do teste executado e detalhe os passos e bugs identificados."
      />

      {/* Alerta de erro */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-100 shadow-xs animate-fade-in font-medium">
          <p className="font-bold">Falha ao salvar</p>
          <p className="text-xs mt-1 font-medium">{error}</p>
        </div>
      )}

      {/* Formulário */}
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <ReportForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Renderização de Toast */}
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
