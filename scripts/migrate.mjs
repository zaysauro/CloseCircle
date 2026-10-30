import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL_UNPOOLED)
  throw Error("Set DATABASE_URL_UNPOOLED to the direct migration URL.");
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const files = [
  "migrations/0000_auth.sql",
  ...(await readdir("drizzle"))
    .filter((x) => x.endsWith(".sql"))
    .sort()
    .map((x) => "drizzle/" + x),
];
await sql`create table if not exists closecircle_migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
for (const name of files) {
  const body = await readFile(name, "utf8"),
    checksum = createHash("sha256").update(body).digest("hex");
  const exists =
    await sql`select checksum from closecircle_migrations where name=${name}`;
  if (exists.length) {
    if (exists[0].checksum !== checksum)
      throw Error("Applied migration was edited: " + name);
    continue;
  }
  const statements = body
    .split(/-->\s*statement-breakpoint|;\s*(?=\n|$)/)
    .map((x) => x.trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql`insert into closecircle_migrations(name,checksum) values(${name},${checksum})`,
  ]);
  console.log("Applied " + name);
}
console.log("Migrations up to date.");
