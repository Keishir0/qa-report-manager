"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/components/auth/AuthProvider";
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
  sndeskUserId?: string | null;
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

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "QA" as UserRole,
  active: true,
  sndeskUserId: "",
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

function sortUsers(users: UserView[]) {
  return [...users].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export default function UsersClient() {
  const currentUser = useAuthUser();
  const canManageAccountLevel = currentUser?.role === "ADMIN";
  const [users, setUsers] = useState<UserView[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isEditing = editingUserId !== null;
  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId) || null,
    [editingUserId, users]
  );

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

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingUserId(null);
    setErrors({});
    setShowPassword(false);
  }

  function startEdit(user: UserView) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role,
      active: user.active,
      sndeskUserId: user.sndeskUserId || "",
    });
    setErrors({});
    setShowPassword(false);
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    const passwordWasTyped = form.password.length > 0 || form.confirmPassword.length > 0;

    if (form.name.trim().length < 2) {
      nextErrors.name = "Informe o nome completo.";
    }
    if (!form.email.includes("@")) {
      nextErrors.email = "Informe um e-mail valido.";
    }
    if ((!isEditing || passwordWasTyped) && form.password.length < 8) {
      nextErrors.password = "Use pelo menos 8 caracteres.";
    }
    if (passwordWasTyped && form.password !== form.confirmPassword) {
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
      const payload: {
        name: string;
        email: string;
        password?: string;
        role?: UserRole;
        active?: boolean;
        sndeskUserId?: string | null;
      } = {
        name: form.name,
        email: form.email,
        sndeskUserId: form.sndeskUserId.trim() || null,
      };

      if (!isEditing || form.password.length > 0) {
        payload.password = form.password;
      }

      if (canManageAccountLevel) {
        payload.role = form.role;
        if (isEditing) {
          payload.active = form.active;
        }
      }

      const response = await fetch(
        isEditing ? `/api/users/${editingUserId}` : "/api/users",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Nao foi possivel atualizar o usuario."
              : "Nao foi possivel criar o usuario.")
        );
      }

      setUsers((current) => {
        if (isEditing) {
          return sortUsers(
            current.map((user) =>
              user.id === result.data.id ? result.data : user
            )
          );
        }

        return sortUsers([...current, result.data]);
      });
      resetForm();
      setToast({
        message: isEditing
          ? "Usuario atualizado com sucesso."
          : "Usuario criado com sucesso.",
        type: "success",
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : isEditing
              ? "Nao foi possivel atualizar o usuario."
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
        title="Usuarios"
        description="Cadastre contas e defina o nivel de acesso de cada pessoa."
      >
        <Button variant="secondary" onClick={loadUsers} isLoading={isLoading}>
          Atualizar
        </Button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,430px)_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {isEditing ? "Editar usuario" : "Novo usuario"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {isEditing
                  ? "Altere dados, senha, status e perfil conforme sua permissao."
                  : "A senha inicial deve ter pelo menos 8 caracteres."}
              </p>
            </div>
            {isEditing && (
              <Button
                variant="secondary"
                className="px-3 py-2 text-xs"
                onClick={resetForm}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            )}
          </div>

          {editingUser && (
            <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
              Editando {editingUser.name}
            </div>
          )}

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
            <Input
              id="user-sndesk-id"
              label="ID Técnico no SNDesk"
              value={form.sndeskUserId}
              onChange={(event) =>
                setForm((current) => ({ ...current, sndeskUserId: event.target.value }))
              }
              error={errors.sndeskUserId}
              maxLength={20}
              placeholder="Ex: 109 (opcional)"
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
              disabled={!canManageAccountLevel}
            >
              <option value="ADMIN">Administrador</option>
              <option value="QA">QA</option>
              <option value="VIEWER">Visualizador</option>
            </Select>
            <p className="-mt-2 text-xs font-medium text-slate-500">
              {ROLE_DESCRIPTIONS[form.role]}
            </p>

            {isEditing && canManageAccountLevel && (
              <Select
                id="user-active"
                label="Status da conta"
                value={form.active ? "active" : "inactive"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.value === "active",
                  }))
                }
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
            )}

            <Input
              id="user-password"
              label={isEditing ? "Nova senha" : "Senha inicial"}
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
              required={!isEditing}
              placeholder={isEditing ? "Deixe em branco para manter a senha" : ""}
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
              required={!isEditing}
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
              {isEditing ? "Salvar usuario" : "Criar usuario"}
            </Button>
          </form>
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="font-extrabold text-slate-900">
              Contas cadastradas
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {users.length} {users.length === 1 ? "usuario" : "usuarios"}
            </p>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Carregando usuarios...
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              title="Nenhum usuario cadastrado"
              description="Use o formulario para criar a primeira conta."
            />
          ) : (
            <div className="overflow-x-auto max-lg:overflow-visible">
              <table className="w-full min-w-[760px] text-left max-lg:block max-lg:min-w-0">
                <thead className="max-lg:hidden">
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Perfil</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Criado em</th>
                    <th className="p-4 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 max-lg:block max-lg:space-y-3 max-lg:divide-y-0 max-lg:p-3">
                  {users.map((user) => (
                    <tr key={user.id} className="text-sm hover:bg-slate-50/70 max-lg:block max-lg:rounded-xl max-lg:border max-lg:border-slate-200 max-lg:bg-white max-lg:shadow-xs">
                      <td data-label="Usuario" className="p-4 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-slate-100 max-lg:text-right max-lg:before:text-left max-lg:before:text-[10px] max-lg:before:font-bold max-lg:before:uppercase max-lg:before:tracking-wider max-lg:before:text-slate-400 max-lg:before:content-[attr(data-label)]">
                        <div>
                          <div className="font-bold text-slate-900">{user.name}</div>
                          <div className="mt-0.5 text-xs font-medium text-slate-500">
                            {user.email}
                          </div>
                          {user.sndeskUserId && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                                SNDesk ID: {user.sndeskUserId}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="Perfil" className="p-4 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-slate-100 max-lg:text-right max-lg:before:text-left max-lg:before:text-[10px] max-lg:before:font-bold max-lg:before:uppercase max-lg:before:tracking-wider max-lg:before:text-slate-400 max-lg:before:content-[attr(data-label)]">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td data-label="Status" className="p-4 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-slate-100 max-lg:text-right max-lg:before:text-left max-lg:before:text-[10px] max-lg:before:font-bold max-lg:before:uppercase max-lg:before:tracking-wider max-lg:before:text-slate-400 max-lg:before:content-[attr(data-label)]">
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
                      <td data-label="Criado em" className="whitespace-nowrap p-4 text-xs font-medium text-slate-500 max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:border-b max-lg:border-slate-100 max-lg:text-right max-lg:before:text-left max-lg:before:text-[10px] max-lg:before:font-bold max-lg:before:uppercase max-lg:before:tracking-wider max-lg:before:text-slate-400 max-lg:before:content-[attr(data-label)]">
                        {formatDate(user.createdAt)}
                      </td>
                      <td data-label="Acoes" className="p-4 text-right max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-4 max-lg:before:text-left max-lg:before:text-[10px] max-lg:before:font-bold max-lg:before:uppercase max-lg:before:tracking-wider max-lg:before:text-slate-400 max-lg:before:content-[attr(data-label)]">
                        <Button
                          variant="secondary"
                          className="px-3 py-2 text-xs"
                          onClick={() => startEdit(user)}
                        >
                          Editar
                        </Button>
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
