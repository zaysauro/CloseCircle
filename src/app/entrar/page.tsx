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
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("convite") || params.has("inicio")) setRegister(true);
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = register
        ? await authClient.signUp.email(
            {
              name,
              email,
              password,
              callbackURL:
                "/app" +
                (new URLSearchParams(window.location.search).get("convite")
                  ? "?convite=" +
                    new URLSearchParams(window.location.search).get("convite")
                  : ""),
            },
            {
              headers: {
                "x-circle-invite":
                  new URLSearchParams(window.location.search).get("convite") ||
                  "",
                "x-bootstrap-token":
                  new URLSearchParams(window.location.search).get("inicio") ||
                  "",
              },
            },
          )
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Não foi possível continuar.");
        return;
      }
      if (register && !result.data?.token) {
        setError(
          "Confira seu e-mail para confirmar o cadastro antes de entrar.",
        );
        return;
      }
      const invitation = new URLSearchParams(window.location.search).get(
        "convite",
      );
      router.push("/app" + (invitation ? "?convite=" + invitation : ""));
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
          {register ? "Entre para o círculo." : "Bom ter você de volta."}
        </h1>
        <p className="mt-3 text-slate-400">Seu espaço, suas pessoas.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {register && (
            <label className="block text-sm text-slate-300">
              Nome
              <input
                required
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
        {!register && (
          <button
            disabled={loading}
            type="button"
            onClick={reset}
            className="mt-4 w-full text-sm text-slate-400"
          >
            Esqueci minha senha
          </button>
        )}
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Rede fechada: novas contas precisam de um convite. Senha com pelo
          menos 10 caracteres.
        </p>
      </div>
    </main>
  );
}
