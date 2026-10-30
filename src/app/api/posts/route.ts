import { getSql } from "@/lib/db";
import { endpoint, member, uuid, text, ApiError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return endpoint(async (me) => {
    const c = uuid(new URL(req.url).searchParams.get("circleId"));
    await member(c, me.id);
    const posts =
      await getSql()`select p.id,p.author_id,p.body,p.created_at,pr.name as author_name,
 (select count(*)::int from comments where post_id=p.id) as comment_count,
 coalesce((select json_agg(json_build_object('emoji',r.emoji,'user_id',r.user_id)) from reactions r where r.post_id=p.id),'[]') as reactions,
 coalesce((select json_agg(a.id) from attachments a where a.post_id=p.id),'[]') as attachments
 from posts p join profiles pr on pr.id=p.author_id where p.circle_id=${c}::uuid order by p.created_at desc limit 50`;
    return { posts };
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
