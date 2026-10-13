import {NextResponse} from "next/server";
import {getIdentity} from "@/lib/identity";
import {getSql} from "@/lib/db";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(req:Request){
 try{const identity=await getIdentity();if(!identity)return NextResponse.json({error:"Não autorizado"},{status:401});
 const circleId=new URL(req.url).searchParams.get("circleId");if(!circleId||!uuid.test(circleId))return NextResponse.json({error:"Círculo inválido"},{status:400});
 const sql=getSql();const posts=await sql`select p.id,p.body,p.created_at,pr.name as author_name from posts p join profiles pr on pr.id=p.author_id where p.circle_id=${circleId}::uuid and exists(select 1 from circle_memberships m where m.circle_id=p.circle_id and m.user_id=${identity.id}::uuid) order by p.created_at desc limit 50`;
 return NextResponse.json({posts});}catch{return NextResponse.json({error:"Serviço indisponível"},{status:503})}
}
export async function POST(req:Request){
 try{const identity=await getIdentity();if(!identity)return NextResponse.json({error:"Não autorizado"},{status:401});
 const data=await req.json();const circleId=typeof data?.circleId==="string"?data.circleId:"";const body=typeof data?.body==="string"?data.body.trim():"";
 if(!uuid.test(circleId)||body.length<1||body.length>5000)return NextResponse.json({error:"Publicação inválida"},{status:400});
 const sql=getSql();const rows=await sql`insert into posts(circle_id,author_id,body) select ${circleId}::uuid,${identity.id}::uuid,${body} where exists(select 1 from circle_memberships where circle_id=${circleId}::uuid and user_id=${identity.id}::uuid) returning id,body,created_at`;
 if(!rows.length)return NextResponse.json({error:"Você não participa deste círculo"},{status:403});
 return NextResponse.json({post:rows[0]},{status:201});
 }catch{return NextResponse.json({error:"Não foi possível publicar"},{status:503})}
}
