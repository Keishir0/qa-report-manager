"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Toast from "@/components/ui/Toast";

type UserRole = "ADMIN" | "QA" | "VIEWER";

interface UserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  QA: "QA",
  VIEWER: "Visualizador",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  ADMIN: "Acesso completo, incluindo usuarios, webhooks e SNDesk.",
  QA: "Cria e edita relatorios, passos e usa a geracao por IA.",
  VIEWER: "Consulta e exporta relatorios, sem permissoes de edicao.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "QA" as UserRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel carregar os usuarios.");
      }

      setUsers(result.data);
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os usuarios.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (form.name.trim().length < 2) {
      nextErrors.name = "Informe o nome completo.";
    }
    if (!form.email.includes("@")) {
      nextErrors.email = "Informe um e-mail valido.";
    }
    if (form.password.length < 8) {
      nextErrors.password = "Use pelo menos 8 caracteres.";
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "As senhas nao conferem.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Nao foi possivel criar o usuario.");
      }

      setUsers((current) =>
        [...current, result.data].sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR")
        )
      );
      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "QA",
      });
      setErrors({});
      setToast({ message: "Usuario criado com sucesso.", type: "success" });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel criar o usuario.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in sm:space-y-8">
      <PageHeader
        title="Usuários"
        description="Cadastre contas e defina o nível de acesso de cada pessoa."
      >
        <Button variant="secondary" onClick={loadUsers} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,430px)_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-900">
              Novo usuário
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              A senha inicial deve ter pelo menos 8 caracteres.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              id="user-name"
              label="Nome"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              error={errors.name}
              maxLength={120}
              autoComplete="name"
              required
            />
            <Input
              id="user-email"
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              error={errors.email}
              maxLength={254}
              autoComplete="email"
              required
            />
            <Select
              id="user-role"
              label="Perfil de acesso"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }
            >
              <option value="ADMIN">Administrador</option>
              <option value="QA">QA</option>
              <option value="VIEWER">Visualizador</option>
            </Select>
            <p className="-mt-2 text-xs font-medium text-slate-500">
              {ROLE_DESCRIPTIONS[form.role]}
            </p>
            <Input
              id="user-password"
              label="Senha inicial"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              error={errors.password}
              minLength={8}
              maxLength={256}
              autoComplete="new-password"
              required
            />
            <Input
              id="user-confirm-password"
              label="Confirmar senha"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              error={errors.confirmPassword}
              minLength={8}
              maxLength={256}
              autoComplete="new-password"
              required
            />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Mostrar senha
            </label>
            <Button type="submit" className="w-full" isLoading={isSaving}>
              Criar usuário
            </Button>
          </form>
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-extrabold text-slate-900">
              Contas cadastradas
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {users.length} {users.length === 1 ? "usuário" : "usuários"}
            </p>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Nenhum usuário cadastrado"
              description="Use o formulário para criar a primeira conta."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="text-sm hover:bg-slate-50/70">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            user.active
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {user.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-4 text-xs font-medium text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
