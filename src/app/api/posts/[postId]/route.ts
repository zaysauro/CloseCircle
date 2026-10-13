import {NextResponse} from "next/server";
import {getIdentity} from "@/lib/identity";
import {getSql} from "@/lib/db";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function DELETE(_req:Request,{params}:{params:Promise<{postId:string}>}){
 try{const {postId}=await params;if(!uuid.test(postId))return NextResponse.json({error:"ID inválido"},{status:400});const me=await getIdentity();if(!me)return NextResponse.json({error:"Não autorizado"},{status:401});const sql=getSql();const deleted=await sql`delete from posts where id=${postId}::uuid and author_id=${me.id}::uuid and not exists(select 1 from comments where post_id=${postId}::uuid) and not exists(select 1 from reactions where post_id=${postId}::uuid) returning id`;if(!deleted.length)return NextResponse.json({error:"Publicação inexistente, não pertence a você ou contém interações"},{status:409});return NextResponse.json({deleted:true})}catch{return NextResponse.json({error:"Não foi possível excluir"},{status:503})}
}
