import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
async function main() {
  if (
    !process.env.CLOSECIRCLE_TEST_DATABASE_HOST ||
    new URL(process.env.DATABASE_URL || "").hostname !==
      process.env.CLOSECIRCLE_TEST_DATABASE_HOST
  )
    throw Error(
      "Set CLOSECIRCLE_TEST_DATABASE_HOST to the isolated development hostname before seeding.",
    );
  const { auth } = await import("../src/lib/auth");
  const users = [];
  for (const name of ["Owner", "Member", "Outsider"]) {
    const email = `test-${name.toLowerCase()}-${Date.now()}@closecircle.test`,
      password = randomBytes(24).toString("base64url");
    const result = await auth.api.signUpEmail({
      body: { name: "Teste " + name, email, password },
    });
    users.push({ email, password, id: result.user.id });
  }
  await writeFile("/tmp/cc-test-users.json", JSON.stringify(users), {
    mode: 0o600,
  });
  console.log("Three isolated test accounts created in development");
  process.exit(0);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Test setup failed");
  process.exit(1);
});
