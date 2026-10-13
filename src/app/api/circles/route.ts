import {NextResponse} from "next/server";
import {getIdentity} from "@/lib/identity";
import {getSql} from "@/lib/db";
export const runtime="nodejs";
export async function GET(){
 try{const identity=await getIdentity();if(!identity)return NextResponse.json({error:"Não autorizado"},{status:401});
 const sql=getSql();const circles=await sql`select c.id,c.name,c.description,c.created_at,m.role from circles c join circle_memberships m on m.circle_id=c.id where m.user_id=${identity.id}::uuid order by c.created_at desc limit 100`;
 return NextResponse.json({circles});}catch{return NextResponse.json({error:"Serviço indisponível"},{status:503})}
}
export async function POST(req:Request){
 try{const identity=await getIdentity();if(!identity)return NextResponse.json({error:"Não autorizado"},{status:401});
 const data=await req.json();const name=typeof data?.name==="string"?data.name.trim():"";const description=typeof data?.description==="string"?data.description.trim():"";
 if(name.length<2||name.length>80||description.length>500)return NextResponse.json({error:"Nome entre 2 e 80 caracteres e descrição até 500."},{status:400});
 const sql=getSql();
 const rows=await sql`with created as (insert into circles(name,description,owner_id) values(${name},${description},${identity.id}::uuid) returning id,name,description,created_at), membership as (insert into circle_memberships(circle_id,user_id,role) select id,${identity.id}::uuid,'owner' from created returning circle_id) select created.id,created.name,created.description,created.created_at from created join membership on membership.circle_id=created.id`;
 return NextResponse.json({circle:rows[0]},{status:201});
 }catch{return NextResponse.json({error:"Não foi possível criar o círculo"},{status:503})}
}
