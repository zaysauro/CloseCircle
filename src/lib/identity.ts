import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSql } from "@/lib/db";
export async function getIdentity(){
 if(!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET)return null;
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return null;
 const sql=getSql();
 const existing=await sql`select id from profiles where auth_user_id=${session.user.id} limit 1`;
 if(existing.length)return {id:String(existing[0].id),session};
 const handle="cc_"+session.user.id.replace(/[^a-zA-Z0-9]/g,"").slice(0,32).toLowerCase();
 const rows=await sql`insert into profiles(auth_user_id,handle,name) values(${session.user.id},${handle},${session.user.name||"Pessoa"}) on conflict (auth_user_id) do update set auth_user_id=excluded.auth_user_id returning id`;
 return {id:String(rows[0].id),session};
}
