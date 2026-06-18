"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/ui/Sidebar";

export default function AppShell({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!user && !isLogin) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLogin, pathname, router, user]);

  if (isLogin) {
    return (
      <AuthProvider user={user}>
        <main className="min-h-screen">{children}</main>
      </AuthProvider>
    );
  }

  if (!user) return null;

  return (
    <AuthProvider user={user}>
      <div className="app-background min-h-screen">
        <Sidebar user={user} />
        <main className="relative z-10 min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:ml-60 lg:p-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
