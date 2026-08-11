import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import BrandBugIcon from "@/components/ui/BrandBugIcon";
import LoginForm from "./LoginForm";

function safeNextPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/";
}

async function getLoginStats() {
  try {
    const [total, approved, branches] = await Promise.all([
      prisma.testReport.count(),
      prisma.testReport.count({ where: { generalStatus: "Aprovado QA" } }),
      prisma.testReport.findMany({ distinct: ["branch"], select: { branch: true } }),
    ]);

    return {
      total,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      branchCount: branches.length,
    };
  } catch {
    return { total: 0, approvalRate: 0, branchCount: 0 };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const stats = await getLoginStats();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="login-background relative flex shrink-0 flex-col justify-between overflow-hidden bg-[radial-gradient(140%_120%_at_15%_-10%,rgb(var(--login-panel-1))_0%,rgb(var(--login-panel-2))_65%)] px-8 py-10 lg:w-[560px] lg:px-14 lg:py-14">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[9px] bg-accent text-accentFg">
            <BrandBugIcon className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-sm font-bold leading-tight text-[rgb(var(--login-panel-fg))]">
              QA Report
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--login-panel-muted))]">
              Manager
            </span>
          </div>
        </div>

        <div className="my-10 lg:my-0">
          <h1 className="max-w-md text-3xl font-extrabold leading-tight text-[rgb(var(--login-panel-fg))] sm:text-4xl">
            Gestão de qualidade, do teste ao deploy.
          </h1>
          <p className="mt-4 max-w-sm text-sm font-medium text-[rgb(var(--login-panel-muted))]">
            Acompanhe relatórios, pendências e integrações de QA em um único
            console.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
          <div>
            <span className="block font-mono text-2xl font-bold text-[rgb(var(--login-panel-fg))]">
              {stats.total}
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[rgb(var(--login-panel-muted))]">
              Testes
            </span>
          </div>
          <div>
            <span className="block font-mono text-2xl font-bold text-[rgb(var(--login-panel-fg))]">
              {stats.approvalRate}%
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[rgb(var(--login-panel-muted))]">
              Aprovação
            </span>
          </div>
          <div>
            <span className="block font-mono text-2xl font-bold text-[rgb(var(--login-panel-fg))]">
              {stats.branchCount}
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-[rgb(var(--login-panel-muted))]">
              Branches
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-fg">Entrar</h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Entre com sua conta para acessar os relatórios de qualidade.
            </p>
          </div>

          <LoginForm nextPath={safeNextPath(searchParams.next)} />
        </div>
      </div>
    </div>
  );
}
