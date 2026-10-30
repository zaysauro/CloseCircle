import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { mailConfigured } from "@/lib/mail";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(req: Request) {
  if (
    new URL(req.url).pathname.endsWith("/request-password-reset") &&
    !mailConfigured
  ) {
    return Response.json(
      {
        message:
          "Use sua chave de recuperação em /recuperar-conta. A recuperação por e-mail ainda não está disponível.",
      },
      { status: 503 },
    );
  }
  return handlers.POST(req);
}
