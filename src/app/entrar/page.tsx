"use client";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export default function Entrar() {
  const router = useRouter();
  const [register, setRegister] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [emailRecovery, setEmailRecovery] = useState(false);
  useEffect(() => {
    fetch("/api/account/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setEmailRecovery(j.emailRecovery === true))
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.has("convite") || params.has("cadastro") || params.has("inicio"))
      setRegister(true);
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (register && password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const invitation = new URLSearchParams(window.location.search).get(
        "convite",
      );
      const destination =
        "/app" +
        (invitation ? "?convite=" + encodeURIComponent(invitation) : "");
      const result = register
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: destination,
          })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        const messages: Record<string, string> = {
          INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
          USER_ALREADY_EXISTS:
            "Este e-mail já tem uma conta. Entre ou recupere sua senha.",
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
            "Este e-mail já tem uma conta. Entre ou recupere sua senha.",
          EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar.",
          PASSWORD_TOO_SHORT: "Use uma senha com pelo menos 10 caracteres.",
          INVALID_EMAIL: "Informe um e-mail válido.",
        };
        setError(
          result.error.status === 429
            ? "Muitas tentativas. Aguarde um minuto e tente novamente."
            : messages[result.error.code || ""] ||
                result.error.message ||
                "Não foi possível continuar.",
        );
        return;
      }
      if (register && !result.data?.token) {
        setError(
          "Confira seu e-mail para confirmar o cadastro antes de entrar.",
        );
        return;
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }
  async function reset() {
    if (!email) {
      setError("Preencha seu e-mail para recuperar a senha.");
      return;
    }
    setLoading(true);
    try {
      const r = await authClient.requestPasswordReset({
        email,
        redirectTo: "/redefinir-senha",
      });
      setError(
        r.error?.message ||
          "Se houver uma conta para este e-mail, enviaremos o link de recuperação.",
      );
    } catch {
      setError("Não foi possível solicitar a recuperação.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-[#101015] px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#19191f] p-9">
        <Link href="/" className="text-2xl font-bold text-violet-200">
          ◎ CloseCircle
        </Link>
        <h1 className="mt-9 text-3xl font-bold">
          {register ? "Seu mundo começa aqui." : "Bom ter você de volta."}
        </h1>
        <p className="mt-3 text-slate-400">Seu espaço, suas pessoas.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {register && (
            <label className="block text-sm text-slate-300">
              Nome
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#111115] p-3 text-white"
              />
            </label>
          )}
          <label className="block text-sm text-slate-300">
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={254}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#111115] p-3 text-white"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Senha
            <input
              required
              type="password"
              minLength={register ? 10 : 1}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={register ? "new-password" : "current-password"}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#111115] p-3 text-white"
            />
          </label>
          {register && (
            <label className="block text-sm text-slate-300">
              Confirme sua senha
              <input
                required
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                minLength={10}
                maxLength={128}
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#111115] p-3 text-white"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full rounded-full bg-violet-400 px-5 py-3 font-semibold text-[#241831] hover:bg-violet-300 disabled:opacity-50"
          >
            {loading ? "Aguarde…" : register ? "Criar minha conta" : "Entrar"}
          </button>
        </form>
        <button
          disabled={loading}
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
          className="mt-6 w-full text-sm text-violet-300"
        >
          {register ? "Já tenho uma conta" : "Criar uma conta"}
        </button>
        {!register && emailRecovery && (
          <button
            disabled={loading}
            type="button"
            onClick={reset}
            className="mt-4 w-full text-sm text-slate-400"
          >
            Receber recuperação por e-mail
          </button>
        )}
        <Link
          href="/recuperar-conta"
          className="mt-4 block text-center text-sm text-violet-300"
        >
          Esqueci minha senha — usar chave de recuperação
        </Link>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Crie sua conta gratuitamente, sem convite. Seus círculos e publicações
          continuam privados. Senha com pelo menos 10 caracteres.
        </p>
      </div>
    </main>
  );
}
