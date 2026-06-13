"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Nao foi possivel entrar.");
      }

      router.replace(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Nao foi possivel entrar."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        id="email"
        label="E-mail"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="username"
        required
      />
      <Input
        id="password"
        label="Senha"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        minLength={8}
        required
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Entrar
      </Button>
    </form>
  );
}
