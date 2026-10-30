import { headers } from "next/headers";
import { getSql } from "@/lib/db";
import { getIdentity } from "@/lib/identity";
import { auth } from "@/lib/auth";
import { recoveryCode, recoveryHash, recoveryContext } from "@/lib/recovery";
import { ApiError, text } from "@/lib/http";
import { createHash } from "node:crypto";
export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store" };
async function rateLimit(req: Request) {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  const key =
    "recovery:" + createHash("sha256").update(ip.trim()).digest("hex");
  const now = Date.now();
  const rows =
    await getSql()`insert into "rateLimit"(id,key,count,"lastRequest") values(${key},${key},1,${now}) on conflict(key) do update set count=case when "rateLimit"."lastRequest"<${now - 600000} then 1 else "rateLimit".count+1 end,"lastRequest"=case when "rateLimit"."lastRequest"<${now - 600000} then ${now} else "rateLimit"."lastRequest" end returning count`;
  if (Number(rows[0].count) > 5)
    throw new ApiError("Aguarde 10 minutos antes de tentar novamente.", 429);
}
export async function GET() {
  try {
    const me = await getIdentity();
    if (!me)
      return Response.json(
        { error: "Entre na sua conta" },
        { status: 401, headers: privateHeaders },
      );
    const rows =
      await getSql()`select profile_id from account_recovery where profile_id=${me.id}::uuid`;
    return Response.json(
      { configured: rows.length > 0 },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "Não foi possível consultar a recuperação" },
      { status: 503, headers: privateHeaders },
    );
  }
}
export async function POST(req: Request) {
  try {
    await rateLimit(req);
    const d = await req.json(),
      sql = getSql();
    if (d.action === "generate") {
      const me = await getIdentity();
      if (!me) throw new ApiError("Entre na sua conta", 401);
      const password = d.password;
      if (
        typeof password !== "string" ||
        password.length < 1 ||
        password.length > 128
      )
        throw new ApiError("Informe sua senha atual");
      try {
        await auth.api.verifyPassword({
          headers: await headers(),
          body: { password },
        });
      } catch {
        throw new ApiError(
          "Senha atual incorreta. Entre novamente se sua sessão for antiga.",
          400,
        );
      }
      const code = recoveryCode();
      const rows =
        await sql`insert into account_recovery(profile_id,code_hash) values(${me.id}::uuid,${recoveryHash(code)}) on conflict(profile_id) do update set code_hash=excluded.code_hash,created_at=now(),claimed_at=null where account_recovery.claimed_at is null or account_recovery.claimed_at<now()-interval '10 minutes' returning profile_id`;
      if (!rows.length)
        throw new ApiError(
          "Uma recuperação está em andamento. Tente novamente.",
          409,
        );
      return Response.json({ code }, { headers: privateHeaders });
    }
    if (d.action !== "recover") throw new ApiError("Ação inválida");
    const email = text(d.email, 254).toLowerCase(),
      code = text(d.code, 100),
      newPassword = d.newPassword;
    if (
      typeof newPassword !== "string" ||
      newPassword.length < 10 ||
      newPassword.length > 128
    )
      throw new ApiError("A nova senha deve ter entre 10 e 128 caracteres");
    if (!/^CC-[A-Za-z0-9_-]{43}$/.test(code))
      throw new ApiError("E-mail ou chave de recuperação inválidos", 400);
    const claimId = new Date().toISOString();
    const rows =
      await sql`update account_recovery r set claimed_at=${claimId}::timestamptz from profiles p join "user" u on u.id=p.auth_user_id where r.profile_id=p.id and lower(u.email)=${email} and r.code_hash=${recoveryHash(code)} and (r.claimed_at is null or r.claimed_at<now()-interval '10 minutes') returning r.profile_id`;
    if (!rows.length)
      throw new ApiError(
        "E-mail ou chave de recuperação inválidos, ou recuperação em andamento.",
        400,
      );
    const profileId = String(rows[0].profile_id);
    let reset = false;
    try {
      await recoveryContext.run({}, async () => {
        await auth.api.requestPasswordReset({ body: { email } });
        const token = recoveryContext.getStore()?.token;
        if (!token) throw Error("No reset token");
        await auth.api.resetPassword({ body: { token, newPassword } });
        reset = true;
      });
      // Invalidate the used recovery key after a successful password change.
      const nextCode = recoveryCode();
      await sql`update account_recovery set code_hash=${recoveryHash(nextCode)},claimed_at=null,created_at=now() where profile_id=${profileId}::uuid and claimed_at=${claimId}::timestamptz`;
      return Response.json(
        { ok: true, code: nextCode },
        { headers: privateHeaders },
      );
    } catch {
      // Never re-enable an already used recovery key if rotation fails.
      if (!reset)
        await sql`update account_recovery set claimed_at=null where profile_id=${profileId}::uuid and claimed_at=${claimId}::timestamptz`;
      throw new ApiError(
        reset
          ? "Senha redefinida. Entre na conta e gere uma nova chave de recuperação."
          : "Não foi possível recuperar a conta. Tente novamente.",
        503,
      );
    }
  } catch (e) {
    if (e instanceof ApiError)
      return Response.json(
        { error: e.message },
        { status: e.status, headers: privateHeaders },
      );
    return Response.json(
      { error: "Não foi possível concluir a recuperação." },
      { status: 503, headers: privateHeaders },
    );
  }
}
