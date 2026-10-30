"use client";
import { useEffect, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
export function AccountRecovery() {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/account/recovery", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw Error(j.error);
        if (active) setConfigured(j.configured);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Não foi possível consultar sua chave. Tente atualizar a página.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="cc-card cc-form">
      <div className="cc-split">
        <h2>Recupere sua conta, mesmo sem e-mail</h2>
        <ShieldCheck size={21} />
      </div>
      <p>
        Guarde uma chave de recuperação em um lugar seguro. Ela permite
        redefinir sua senha se você esquecer. A chave fica visível somente
        agora; gerar outra substitui a anterior.
      </p>
      <p className="cc-muted">
        {configured === null
          ? "Consultando…"
          : configured
            ? "Sua conta já tem uma chave de recuperação."
            : "Você ainda não gerou sua chave."}
      </p>
      {!code ? (
        <form
          className="cc-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch("/api/account/recovery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "generate", password }),
              });
              const j = await r.json();
              if (!r.ok) throw Error(j.error);
              setCode(j.code);
              setConfigured(true);
              setPassword("");
            } catch (e) {
              setMessage(
                e instanceof Error
                  ? e.message
                  : "Não foi possível gerar a chave",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Confirme sua senha atual
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          <button className="cc-primary" disabled={busy}>
            {busy
              ? "Gerando…"
              : configured
                ? "Gerar nova chave"
                : "Gerar minha chave de recuperação"}
          </button>
        </form>
      ) : (
        <>
          <code className="cc-recovery-code">{code}</code>
          <button
            className="cc-secondary"
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setMessage("Chave copiada. Guarde-a fora do CloseCircle.");
              } catch {
                setMessage("Selecione e copie a chave acima.");
              }
            }}
          >
            <Copy size={15} /> Copiar chave
          </button>
          <button
            className="cc-primary"
            type="button"
            onClick={() => {
              setCode("");
              setMessage(
                "Chave salva. Você poderá usá-la em Recuperar conta na tela de entrada.",
              );
            }}
          >
            Já guardei minha chave
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
