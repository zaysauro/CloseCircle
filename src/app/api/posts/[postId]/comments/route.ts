import {NextResponse} from "next/server";
import {getIdentity} from "@/lib/identity";
import {getSql} from "@/lib/db";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_req:Request,{params}:{params:Promise<{postId:string}>}){
 try{const {postId}=await params;if(!uuid.test(postId))return NextResponse.json({error:"ID inválido"},{status:400});const me=await getIdentity();if(!me)return NextResponse.json({error:"Não autorizado"},{status:401});const sql=getSql();const comments=await sql`select c.id,c.body,c.created_at,p.name as author_name from comments c join posts post on post.id=c.post_id join profiles p on p.id=c.author_id where c.post_id=${postId}::uuid and exists(select 1 from circle_memberships m where m.circle_id=post.circle_id and m.user_id=${me.id}::uuid) order by c.created_at asc limit 100`;return NextResponse.json({comments})}catch{return NextResponse.json({error:"Serviço indisponível"},{status:503})}
}
export async function POST(req:Request,{params}:{params:Promise<{postId:string}>}){
 try{const {postId}=await params;if(!uuid.test(postId))return NextResponse.json({error:"ID inválido"},{status:400});const me=await getIdentity();if(!me)return NextResponse.json({error:"Não autorizado"},{status:401});const data=await req.json();const body=typeof data?.body==="string"?data.body.trim():"";if(!body||body.length>2000)return NextResponse.json({error:"Comentário inválido"},{status:400});const sql=getSql();const rows=await sql`insert into comments(post_id,author_id,body) select p.id,${me.id}::uuid,${body} from posts p where p.id=${postId}::uuid and exists(select 1 from circle_memberships m where m.circle_id=p.circle_id and m.user_id=${me.id}::uuid) returning id,body,created_at`;if(!rows.length)return NextResponse.json({error:"Publicação indisponível"},{status:404});return NextResponse.json({comment:rows[0]},{status:201})}catch{return NextResponse.json({error:"Não foi possível comentar"},{status:503})}
}
