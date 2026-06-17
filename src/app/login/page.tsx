import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BrandBugIcon from "@/components/ui/BrandBugIcon";
import LoginForm from "./LoginForm";

function safeNextPath(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-7">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-2xl bg-indigo-50 p-4 text-indigo-700">
              <BrandBugIcon className="h-9 w-9" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950">
            QA Report Manager
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Entre com sua conta para acessar os relatorios de qualidade.
          </p>
        </div>

        <LoginForm nextPath={safeNextPath(searchParams.next)} />
      </div>
    </div>
  );
}
