import { randomBytes, createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { endpoint, member, uuid, text, ApiError } from "@/lib/http";
export const runtime = "nodejs";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export async function GET(req: Request) {
  return endpoint(async (me) => {
    const q = new URL(req.url).searchParams,
      sql = getSql(),
      resource = q.get("resource");
    if (resource === "profile") {
      const rows =
        await sql`select id,name,handle,bio from profiles where id=${me.id}::uuid`;
      return { profile: rows[0] };
    }
    if (resource === "members") {
      const c = uuid(q.get("circleId"));
      await member(c, me.id);
      return {
        members:
          await sql`select p.id,p.name,p.handle,m.role from profiles p join circle_memberships m on m.user_id=p.id where m.circle_id=${c}::uuid order by m.joined_at`,
      };
    }
    if (resource === "invites") {
      const c = uuid(q.get("circleId"));
      await member(c, me.id, true);
      return {
        invites:
          await sql`select id,expires_at,used_at,revoked from circle_invites where circle_id=${c}::uuid order by created_at desc limit 50`,
      };
    }
    if (resource === "events") {
      return {
        events:
          await sql`select e.*,c.name as circle_name from events e join circles c on c.id=e.circle_id join circle_memberships m on m.circle_id=c.id where m.user_id=${me.id}::uuid and e.starts_at>now()-interval '1 day' order by e.starts_at limit 100`,
      };
    }
    if (resource === "notifications") {
      return {
        notifications:
          await sql`select * from notifications where user_id=${me.id}::uuid order by created_at desc limit 100`,
      };
    }
    if (resource === "friends") {
      return {
        friends:
          await sql`select f.requester_id,f.addressee_id,f.status,p.id,p.name,p.handle from friendships f join profiles p on p.id=case when f.requester_id=${me.id}::uuid then f.addressee_id else f.requester_id end where f.requester_id=${me.id}::uuid or f.addressee_id=${me.id}::uuid order by f.created_at desc limit 100`,
      };
    }
    if (resource === "conversations") {
      return {
        conversations:
          await sql`select distinct c.id,c.circle_id,c.is_group,coalesce(ci.name,c.name,'Conversa privada') as name from conversations c left join circles ci on ci.id=c.circle_id where (c.circle_id is not null and exists(select 1 from circle_memberships m where m.circle_id=c.circle_id and m.user_id=${me.id}::uuid)) or (c.circle_id is null and exists(select 1 from conversation_members m where m.conversation_id=c.id and m.user_id=${me.id}::uuid)) order by c.id limit 100`,
      };
    }
    if (resource === "messages") {
      const id = uuid(q.get("conversationId"));
      const allowed =
        await sql`select c.id from conversations c where c.id=${id}::uuid and ((c.circle_id is not null and exists(select 1 from circle_memberships m where m.circle_id=c.circle_id and m.user_id=${me.id}::uuid)) or (c.circle_id is null and exists(select 1 from conversation_members m where m.conversation_id=c.id and m.user_id=${me.id}::uuid)))`;
      if (!allowed.length) throw new ApiError("Conversa indisponível", 403);
      return {
        messages:
          await sql`select * from (select m.id,m.body,m.sender_id,m.created_at,p.name from messages m join profiles p on p.id=m.sender_id where m.conversation_id=${id}::uuid order by m.created_at desc limit 100) recent order by created_at`,
      };
    }
    throw new ApiError("Recurso inválido");
  });
}
export async function POST(req: Request) {
  return endpoint(async (me) => {
    const d = await req.json(),
      sql = getSql();
    switch (d.action) {
      case "profile": {
        const name = text(d.name, 100),
          bio = text(d.bio, 500, 0),
          handle = text(d.handle, 40).toLowerCase();
        if (!/^[a-z0-9_]{3,40}$/.test(handle))
          throw new ApiError("Identificador: 3–40 letras, números ou _");
        const exists =
          await sql`select id from profiles where handle=${handle} and id<>${me.id}::uuid`;
        if (exists.length)
          throw new ApiError("Identificador já utilizado", 409);
        await sql`update profiles set name=${name},bio=${bio},handle=${handle} where id=${me.id}::uuid`;
        return { ok: true };
      }
      case "invite": {
        const c = uuid(d.circleId);
        await member(c, me.id, true);
        const token = randomBytes(32).toString("hex");
        const rows =
          await sql`insert into circle_invites(circle_id,created_by,token_hash,expires_at) values(${c}::uuid,${me.id}::uuid,${hash(token)},now()+interval '7 days') returning id,expires_at`;
        return { invite: rows[0], token };
      }
      case "revoke-invite": {
        const id = uuid(d.id);
        const r =
          await sql`update circle_invites i set revoked=true where i.id=${id}::uuid and exists(select 1 from circle_memberships m where m.circle_id=i.circle_id and m.user_id=${me.id}::uuid and m.role='owner') returning id`;
        if (!r.length) throw new ApiError("Convite indisponível", 403);
        return { ok: true };
      }
      case "join": {
        const token = text(d.token, 64);
        if (!/^[a-f0-9]{64}$/.test(token))
          throw new ApiError("Convite inválido");
        const rows =
          await sql`with claimed as (update circle_invites set used_by=${me.id}::uuid,used_at=now() where token_hash=${hash(token)} and used_at is null and revoked=false and expires_at>now() returning circle_id), joined as (insert into circle_memberships(circle_id,user_id) select circle_id,${me.id}::uuid from claimed on conflict do nothing returning circle_id) select circle_id from claimed`;
        if (!rows.length)
          throw new ApiError("Convite expirado, revogado ou já utilizado", 410);
        return { circleId: rows[0].circle_id };
      }
      case "add-member": {
        const c = uuid(d.circleId),
          handle = text(d.handle, 41).replace(/^@/, "").toLowerCase();
        await member(c, me.id, true);
        const rows = await sql`with added as (
          insert into circle_memberships(circle_id,user_id)
          select ${c}::uuid,p.id from profiles p where p.handle=${handle} and p.id<>${me.id}::uuid
          and exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=${me.id}::uuid and f.addressee_id=p.id) or (f.addressee_id=${me.id}::uuid and f.requester_id=p.id)))
          and exists(select 1 from circle_memberships m where m.circle_id=${c}::uuid and m.user_id=${me.id}::uuid and m.role='owner')
          on conflict do nothing returning user_id
        ),notice as (insert into notifications(user_id,kind,body) select user_id,'circle','Um amigo adicionou você a um círculo privado.' from added returning id)
        select user_id from added`;
        if (!rows.length)
          throw new ApiError(
            "Use o @ de um amigo com amizade aceita que ainda não participa deste círculo.",
            409,
          );
        return { ok: true };
      }
      case "remove-member": {
        const c = uuid(d.circleId),
          id = uuid(d.userId);
        await member(c, me.id, true);
        if (id === me.id)
          throw new ApiError("O responsável não pode remover a si mesmo");
        await sql`delete from circle_memberships where circle_id=${c}::uuid and user_id=${id}::uuid and role<>'owner'`;
        return { ok: true };
      }
      case "leave": {
        const c = uuid(d.circleId);
        await member(c, me.id);
        const owner =
          await sql`select id from circles where id=${c}::uuid and owner_id=${me.id}::uuid`;
        if (owner.length)
          throw new ApiError("O responsável deve permanecer no círculo");
        await sql`delete from circle_memberships where circle_id=${c}::uuid and user_id=${me.id}::uuid`;
        return { ok: true };
      }
      case "react": {
        const id = uuid(d.postId),
          emoji = text(d.emoji, 8);
        if (!["💜", "👍", "😂", "🎉"].includes(emoji))
          throw new ApiError("Reação inválida");
        const rows =
          await sql`select p.circle_id from posts p join circle_memberships m on m.circle_id=p.circle_id where p.id=${id}::uuid and m.user_id=${me.id}::uuid`;
        if (!rows.length) throw new ApiError("Publicação indisponível", 403);
        if (d.remove)
          await sql`delete from reactions where post_id=${id}::uuid and user_id=${me.id}::uuid and emoji=${emoji}`;
        else
          await sql`insert into reactions(post_id,user_id,emoji) values(${id}::uuid,${me.id}::uuid,${emoji}) on conflict do nothing`;
        return { ok: true };
      }
      case "event": {
        const c = uuid(d.circleId);
        await member(c, me.id);
        const title = text(d.title, 120),
          description = text(d.description, 2000, 0),
          start = new Date(d.startsAt);
        if (!Number.isFinite(start.getTime()))
          throw new ApiError("Data inválida");
        await sql.transaction([
          sql`insert into events(circle_id,creator_id,title,description,starts_at) values(${c}::uuid,${me.id}::uuid,${title},${description},${start.toISOString()})`,
          sql`insert into notifications(user_id,kind,body) select user_id,'event','Há um novo evento no seu círculo.' from circle_memberships where circle_id=${c}::uuid and user_id<>${me.id}::uuid`,
        ]);
        return { ok: true };
      }
      case "delete-event": {
        const r =
          await sql`delete from events where id=${uuid(d.id)}::uuid and creator_id=${me.id}::uuid returning id`;
        if (!r.length) throw new ApiError("Evento indisponível", 403);
        return { ok: true };
      }
      case "read-notifications": {
        await sql`update notifications set read=true where user_id=${me.id}::uuid`;
        return { ok: true };
      }
      case "friend": {
        const handle = text(d.handle, 40).replace(/^@/, "").toLowerCase();
        const rows =
          await sql`select id from profiles where handle=${handle} and id<>${me.id}::uuid`;
        if (!rows.length) throw new ApiError("Pessoa não encontrada", 404);
        const other = String(rows[0].id);
        const existing =
          await sql`select status from friendships where (requester_id=${me.id}::uuid and addressee_id=${other}::uuid) or (requester_id=${other}::uuid and addressee_id=${me.id}::uuid)`;
        if (existing.length)
          throw new ApiError("Vocês já têm uma solicitação ou amizade", 409);
        await sql.transaction([
          sql`insert into friendships(requester_id,addressee_id) values(${me.id}::uuid,${other}::uuid) on conflict do nothing`,
          sql`insert into notifications(user_id,kind,body) values(${other}::uuid,'friend','Você recebeu uma solicitação de amizade.')`,
        ]);
        return { ok: true };
      }
      case "accept-friend": {
        const rows =
          await sql`update friendships set status='accepted' where requester_id=${uuid(d.userId)}::uuid and addressee_id=${me.id}::uuid and status='pending' returning requester_id`;
        if (!rows.length) throw new ApiError("Solicitação indisponível", 404);
        return { ok: true };
      }
      case "remove-friend": {
        const id = uuid(d.userId);
        await sql`delete from friendships where (requester_id=${id}::uuid and addressee_id=${me.id}::uuid) or (requester_id=${me.id}::uuid and addressee_id=${id}::uuid)`;
        return { ok: true };
      }
      case "conversation": {
        if (d.circleId) {
          const c = uuid(d.circleId);
          await member(c, me.id);
          const rows =
            await sql`insert into conversations(circle_id,is_group) values(${c}::uuid,true) on conflict(circle_id) do update set circle_id=excluded.circle_id returning id`;
          return { id: rows[0].id };
        }
        const other = uuid(d.userId);
        const friends =
          await sql`select status from friendships where status='accepted' and ((requester_id=${me.id}::uuid and addressee_id=${other}::uuid) or (requester_id=${other}::uuid and addressee_id=${me.id}::uuid))`;
        if (!friends.length)
          throw new ApiError(
            "Adicione esta pessoa aos amigos antes de conversar",
            403,
          );
        const existing =
          await sql`select c.id from conversations c where c.is_group=false and exists(select 1 from conversation_members where conversation_id=c.id and user_id=${me.id}::uuid) and exists(select 1 from conversation_members where conversation_id=c.id and user_id=${other}::uuid) limit 1`;
        if (existing.length) return { id: existing[0].id };
        const rows =
          await sql`with c as (insert into conversations(name,is_group) select 'Conversa · '||name,false from profiles where id=${other}::uuid returning id), m as (insert into conversation_members(conversation_id,user_id) select id,${me.id}::uuid from c union all select id,${other}::uuid from c returning conversation_id) select id from c`;
        return { id: rows[0].id };
      }
      case "message": {
        const id = uuid(d.conversationId),
          body = text(d.body, 5000);
        const rows =
          await sql`insert into messages(conversation_id,sender_id,body) select c.id,${me.id}::uuid,${body} from conversations c where c.id=${id}::uuid and ((c.circle_id is not null and exists(select 1 from circle_memberships m where m.circle_id=c.circle_id and m.user_id=${me.id}::uuid)) or (c.circle_id is null and exists(select 1 from conversation_members m where m.conversation_id=c.id and m.user_id=${me.id}::uuid))) returning id`;
        if (!rows.length) throw new ApiError("Conversa indisponível", 403);
        return { ok: true };
      }
      default:
        throw new ApiError("Ação inválida");
    }
  });
}
