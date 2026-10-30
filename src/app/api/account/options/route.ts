import { mailConfigured } from "@/lib/mail";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { emailRecovery: mailConfigured },
    { headers: { "Cache-Control": "no-store" } },
  );
}
