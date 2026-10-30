import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { SocialApp } from "@/components/social-app";
export const dynamic = "force-dynamic";
export default async function AppHome() {
  const me = await getIdentity();
  if (!me) redirect("/entrar");
  return <SocialApp meId={me.id} email={me.session.user.email} />;
}
