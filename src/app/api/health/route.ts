import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({status:"ok",databaseConfigured:Boolean(process.env.DATABASE_URL),authConfigured:Boolean(process.env.BETTER_AUTH_SECRET&&process.env.BETTER_AUTH_URL)},{headers:{"Cache-Control":"no-store"}})}
