"use client";
import {authClient} from "@/lib/auth-client";
export function SignOut(){return <button onClick={async()=>{await authClient.signOut();window.location.assign("/entrar")}} className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Sair</button>}
