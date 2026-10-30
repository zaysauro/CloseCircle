import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";
import { nextCookies } from "better-auth/next-js";
import { mailConfigured, sendAuthEmail } from "./mail";
import { recoveryContext } from "./recovery";
const url = process.env.DATABASE_URL;
export const auth = betterAuth({
  database: url ? new Pool({ connectionString: url }) : undefined,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: mailConfigured,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      const recovery = recoveryContext.getStore();
      if (recovery) {
        recovery.token = token;
        return;
      }
      await sendAuthEmail(
        user.email,
        "Redefinir sua senha no CloseCircle",
        url,
      );
    },
  },
  ...(mailConfigured
    ? {
        emailVerification: {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({
            user,
            url,
          }: {
            user: { email: string };
            url: string;
          }) => {
            await sendAuthEmail(
              user.email,
              "Confirme seu e-mail no CloseCircle",
              url,
            );
          },
        },
      }
    : {}),
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  plugins: [nextCookies()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL].filter((x): x is string =>
    Boolean(x),
  ),
});
