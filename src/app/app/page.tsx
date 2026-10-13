import {SignOut} from "@/components/sign-out";
import {CircleBoard} from "@/components/circle-board";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {auth} from "@/lib/auth";
import {CircleUserRound,Home,Users,MessageCircle,CalendarDays,ShieldCheck} from "lucide-react";
export const dynamic="force-dynamic";
export default async function AppHome(){
  if(!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) redirect("/entrar");
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/entrar");
  const sections=[{name:"Feed",icon:Home},{name:"Círculos",icon:Users},{name:"Mensagens",icon:MessageCircle},{name:"Calendário",icon:CalendarDays}];
  return <main className="min-h-screen bg-[#090b17]"><div className="mx-auto flex min-h-screen max-w-6xl"><aside className="hidden w-64 shrink-0 border-r border-white/10 p-7 md:block"><Link href="/" className="text-xl font-bold">◎ CloseCircle</Link><nav className="mt-12 space-y-2">{sections.map(({name,icon:Icon})=><div key={name} className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400"><Icon size={19}/>{name}<span className="ml-auto text-[10px]">Em breve</span></div>)}</nav></aside><div className="w-full p-6 md:p-12"><header className="flex items-center justify-between border-b border-white/10 pb-8"><div><p className="text-sm text-violet-300">Seu espaço privado</p><h1 className="mt-2 text-3xl font-bold">Olá, {session.user.name}!</h1></div><div className="flex items-center gap-4"><CircleUserRound size={38} className="text-violet-300"/><SignOut/></div></header><section className="mt-8 max-w-2xl rounded-3xl border border-violet-400/20 bg-white/5 p-6"><ShieldCheck className="mb-6 text-emerald-400" size={34}/><h2 className="text-2xl font-bold">Seu CloseCircle começou.</h2><p className="mt-4 leading-7 text-slate-300">Crie um círculo privado e compartilhe suas primeiras publicações com segurança. Mensagens e calendário estão em desenvolvimento.</p><p className="mt-5 text-sm text-slate-500">Conta: {session.user.email}</p></section><CircleBoard/></div></div></main>
}
