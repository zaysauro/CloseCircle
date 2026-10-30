"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
export default function ResetPassword() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form
        className="cc-card cc-form w-full max-w-md"
        onSubmit={async (e) => {
          e.preventDefault();
          const token = new URLSearchParams(window.location.search).get(
            "token",
          );
          if (!token) {
            setMessage("Link inválido. Solicite uma nova recuperação.");
            return;
          }
          setBusy(true);
          try {
            const result = await authClient.resetPassword({
              token,
              newPassword: String(
                new FormData(e.currentTarget).get("password"),
              ),
            });
            setMessage(
              result.error?.message || "Senha redefinida. Você já pode entrar.",
            );
          } catch {
            setMessage("Não foi possível redefinir a senha.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Link href="/" className="cc-brand">
          ◎ CloseCircle
        </Link>
        <h1 className="text-2xl font-bold">Uma nova senha.</h1>
        <label>
          Nova senha
          <input
            name="password"
            type="password"
            minLength={10}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="cc-primary" disabled={busy}>
          Redefinir senha
        </button>
        <p role="status">{message}</p>
        <Link href="/entrar">Voltar para entrar</Link>
      </form>
    </main>
  );
}
