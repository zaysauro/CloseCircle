import { endpoint, uuid, ApiError } from "@/lib/http";
import { getSql } from "@/lib/db";
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  return endpoint(async (me) => {
    const id = uuid((await params).postId);
    const rows =
      await getSql()`delete from posts p where p.id=${id}::uuid and p.author_id=${me.id}::uuid and exists(select 1 from circle_memberships m where m.circle_id=p.circle_id and m.user_id=${me.id}::uuid) returning id`;
    if (!rows.length) throw new ApiError("Publicação indisponível", 403);
    return { deleted: true };
  });
}
