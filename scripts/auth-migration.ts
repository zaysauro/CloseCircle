import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { auth } = await import("../src/lib/auth");
  const { getMigrations } = await import("better-auth/db/migration");
  const migration = await getMigrations(auth.options);
  const fs = await import("node:fs/promises");
  await fs.mkdir("migrations", { recursive: true });
  await fs.writeFile(
    "migrations/0000_auth.sql",
    await migration.compileMigrations(),
  );
  console.log("Auth SQL generated for review.");
  process.exit(0);
}
main().catch(() => {
  console.error("Failed to generate auth migration");
  process.exit(1);
});
