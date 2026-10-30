import { getSql } from "@/lib/db";
import { endpoint, member, uuid, text, ApiError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return endpoint(async (me) => {
    const params = new URL(req.url).searchParams;
    const circleId = params.get("circleId");
    const c = circleId === null ? null : uuid(circleId);
    if (c) await member(c, me.id);
    let before: string | null = null,
      beforeId: string | null = null;
    const cursor = params.get("cursor");
    if (cursor) {
      if (cursor.length > 512) throw new ApiError("Página inválida");
      try {
        const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString());
        if (
          !Array.isArray(parsed) ||
          parsed.length !== 2 ||
          typeof parsed[0] !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(parsed[0]) ||
          !Number.isFinite(Date.parse(parsed[0]))
        )
          throw Error();
        before = parsed[0];
        beforeId = uuid(parsed[1]);
      } catch {
        throw new ApiError("Página inválida");
      }
    }
    const rows =
      await getSql()`select p.id,p.circle_id,c.name as circle_name,p.author_id,p.body,p.created_at,pr.name as author_name,
      to_char(p.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_created_at,
      (select count(*)::int from comments where post_id=p.id) as comment_count,
      coalesce((select json_agg(json_build_object('emoji',r.emoji,'user_id',r.user_id)) from reactions r where r.post_id=p.id),'[]') as reactions,
      coalesce((select json_agg(a.id) from attachments a where a.post_id=p.id),'[]') as attachments
      from posts p join profiles pr on pr.id=p.author_id join circles c on c.id=p.circle_id
      where exists(select 1 from circle_memberships m where m.circle_id=p.circle_id and m.user_id=${me.id}::uuid)
      and (${c}::uuid is null or p.circle_id=${c}::uuid)
      and (${before}::timestamptz is null or (p.created_at,p.id)<(${before}::timestamptz,${beforeId}::uuid))
      order by p.created_at desc,p.id desc limit 26`;
    const page = rows.slice(0, 25),
      last = page.at(-1);
    return {
      posts: page.map(({ cursor_created_at, ...post }) => post),
      nextCursor:
        rows.length > 25 && last
          ? Buffer.from(
              JSON.stringify([last.cursor_created_at, last.id]),
            ).toString("base64url")
          : null,
    };
  });
}
export async function POST(req: Request) {
  return endpoint(async (me) => {
    const d = await req.json(),
      c = uuid(d.circleId),
      body = text(d.body, 5000, 0);
    await member(c, me.id);
    let image: null | { mime: string; data: string } = null;
    if (d.image) {
      const match =
        typeof d.image === "string" &&
        d.image.match(
          /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
        );
      if (!match) throw new ApiError("Envie uma imagem PNG, JPEG ou WebP");
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > 2 * 1024 * 1024)
        throw new ApiError("A imagem deve ter até 2 MB");
      const valid =
        match[1] === "image/png"
          ? bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
          : match[1] === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP";
      if (!valid) throw new ApiError("Arquivo de imagem inválido");
      image = { mime: match[1], data: match[2] };
    }
    if (!body && !image) throw new ApiError("Escreva algo ou escolha uma foto");
    const sql = getSql();
    const rows = image
      ? await sql`with p as (insert into posts(circle_id,author_id,body) values(${c}::uuid,${me.id}::uuid,${body}) returning id),a as (insert into attachments(circle_id,uploader_id,post_id,mime,data) select ${c}::uuid,${me.id}::uuid,id,${image.mime},${image.data} from p returning id) select id from p`
      : await sql`insert into posts(circle_id,author_id,body) values(${c}::uuid,${me.id}::uuid,${body}) returning id`;
    return { post: rows[0] };
  });
}
