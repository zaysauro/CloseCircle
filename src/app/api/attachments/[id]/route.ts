import { getSql } from "@/lib/db";
import { getIdentity } from "@/lib/identity";
import { uuid } from "@/lib/http";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getIdentity();
    if (!me) return new Response(null, { status: 401 });
    const id = uuid((await params).id);
    const rows =
      await getSql()`select a.mime,a.data from attachments a join circle_memberships m on m.circle_id=a.circle_id where a.id=${id}::uuid and m.user_id=${me.id}::uuid`;
    if (!rows.length) return new Response(null, { status: 404 });
    return new Response(Buffer.from(rows[0].data, "base64"), {
      headers: {
        "Content-Type": rows[0].mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response(null, { status: 400 });
  }
}
