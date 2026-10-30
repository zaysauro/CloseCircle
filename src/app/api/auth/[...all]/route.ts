import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { getSql } from "@/lib/db";
import { mailConfigured } from "@/lib/mail";
import { createHash } from "node:crypto";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(req: Request) {
  if (
    new URL(req.url).pathname.endsWith("/request-password-reset") &&
    !mailConfigured
  )
    return Response.json(
      {
        message:
          "A recuperação de senha depende da configuração do serviço de e-mail pelo responsável.",
      },
      { status: 503 },
    );
  if (new URL(req.url).pathname.endsWith("/sign-up/email")) {
    try {
      const data = await req.clone().json();
      const bootstrap = (process.env.BOOTSTRAP_EMAIL || "").toLowerCase();
      const token = req.headers.get("x-circle-invite") || "";
      const sql = getSql();
      const bootstrapToken = req.headers.get("x-bootstrap-token") || "";
      const validBootstrap =
        /^[a-f0-9]{64}$/.test(bootstrapToken) &&
        createHash("sha256").update(bootstrapToken).digest("hex") ===
          process.env.BOOTSTRAP_TOKEN_HASH;
      const first =
        validBootstrap &&
        bootstrap &&
        typeof data.email === "string" &&
        data.email.toLowerCase() === bootstrap &&
        (await sql`select id from "user" limit 1`).length === 0;
      const invited =
        /^[a-f0-9]{64}$/.test(token) &&
        (
          await sql`select id from circle_invites where token_hash=${createHash("sha256").update(token).digest("hex")} and used_at is null and revoked=false and expires_at>now() limit 1`
        ).length > 0;
      if (!first && !invited)
        return Response.json(
          {
            message:
              "O CloseCircle é fechado. Use um convite válido para criar sua conta.",
          },
          { status: 403 },
        );
    } catch {
      return Response.json(
        { message: "Não foi possível validar seu convite." },
        { status: 503 },
      );
    }
  }
  return handlers.POST(req);
}
