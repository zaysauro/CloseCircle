"use client";
import Link from "next/link";
import { useState } from "react";
export default function RecoverAccount() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState("");
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="cc-card cc-form w-full max-w-md">
        <Link href="/" className="cc-brand">
          ◎ CloseCircle
        </Link>
        <h1 className="text-2xl font-bold">Recuperar minha conta</h1>
        {code ? (
          <>
            <p>
              Sua senha foi atualizada e as sessões anteriores foram encerradas.
              A chave antiga foi substituída. Guarde sua nova chave antes de
              entrar:
            </p>
            <code className="cc-recovery-code">{code}</code>
            <button
              type="button"
              className="cc-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setMessage("Nova chave copiada.");
                } catch {
                  setMessage("Selecione e copie a nova chave acima.");
                }
              }}
            >
              Copiar nova chave
            </button>
          </>
        ) : (
          <>
            <p>
              Use a chave que você guardou em Meu perfil → Recuperação da conta.
              Você não precisa receber um e-mail.
            </p>
            <form
              className="cc-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = new FormData(form);
                if (f.get("password") !== f.get("confirmation")) {
                  setMessage("As senhas precisam ser iguais.");
                  return;
                }
                setBusy(true);
                setMessage("");
                try {
                  const r = await fetch("/api/account/recovery", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "recover",
                      email: f.get("email"),
                      code: f.get("code"),
                      newPassword: f.get("password"),
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw Error(j.error);
                  setCode(j.code);
                  form.reset();
                } catch (e) {
                  setMessage(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível recuperar a conta",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Chave de recuperação
                <input
                  name="code"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  placeholder="CC-…"
                  maxLength={100}
                />
              </label>
              <label>
                Nova senha
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </label>
              <label>
                Confirme a nova senha
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  required
                />
              </label>
              <button className="cc-primary" disabled={busy}>
                {busy ? "Recuperando…" : "Redefinir minha senha"}
              </button>
            </form>
          </>
        )}
        {message && <p role="status">{message}</p>}
        <Link href="/entrar" className="text-violet-300">
          {code
            ? "Guardei a chave. Entrar na minha conta"
            : "Voltar para entrar"}
        </Link>
      </section>
    </main>
  );
}
