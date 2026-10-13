import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";
const url=process.env.DATABASE_URL;
export const auth=betterAuth({
  database: url ? new Pool({connectionString:url}) : undefined,
  emailAndPassword:{enabled:true},
  secret:process.env.BETTER_AUTH_SECRET,
  baseURL:process.env.BETTER_AUTH_URL,
  trustedOrigins:[process.env.BETTER_AUTH_URL].filter((x):x is string=>Boolean(x)),
});
