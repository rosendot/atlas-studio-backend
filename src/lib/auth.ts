import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { getDb, schema } from "../db/client";
import type { Bindings } from "../../worker-configuration";
import { STUDIO_EMAIL } from "./studio";

/**
 * Build a request-scoped Better Auth instance bound to the current Worker env.
 *
 * Better Auth needs the D1 binding (via Drizzle) and access to bindings for
 * email/OAuth secrets. We can't construct it as a module-level singleton
 * because bindings only exist on a request's `env`, so each request builds its
 * own — same pattern as `getDb(env)`.
 */
export function getAuth(env: Bindings) {
  const resend = new Resend(env.RESEND_API_KEY);

  const frontendOrigin = env.FRONTEND_URL.replace(/\/$/, "");
  const baseURL = frontendOrigin + "/api/auth";
  const cookieDomain = new URL(frontendOrigin).hostname.replace(/^www\./, "");

  const options: BetterAuthOptions = {
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(env), {
      provider: "sqlite",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    advanced: {
      defaultCookieAttributes: {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        domain: cookieDomain,
      },
    },
    emailAndPassword: {
      enabled: true,
      // Public sign-up stays enabled because /auth/invite uses auth.api.signUpEmail
      // server-side. We mitigate sign-up squatting two ways:
      //   1. requireEmailVerification: true — unverified accounts can't log in
      //   2. Authenticated routes filter by clients.authUid, so a stray signup
      //      that isn't an admin and has no clients row sees nothing.
      requireEmailVerification: true,
      autoSignIn: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        await resend.emails.send({
          from: STUDIO_EMAIL,
          to: user.email,
          subject: "Reset your Atlas Studio password",
          text: [
            `Hi ${user.name || ""},`,
            "",
            `Use this link to set a new password:`,
            "",
            url,
            "",
            `If you didn't ask for this, ignore the email — your password won't change.`,
            "",
            `— Atlas Studio`,
          ].join("\n"),
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await resend.emails.send({
          from: STUDIO_EMAIL,
          to: user.email,
          subject: "Verify your email",
          text: [
            `Hi ${user.name || ""},`,
            "",
            `Confirm your email so we can finish setting up your portal:`,
            "",
            url,
            "",
            `— Atlas Studio`,
          ].join("\n"),
        });
      },
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
    trustedOrigins: [env.FRONTEND_URL],
  };

  return betterAuth(options);
}

export type Auth = ReturnType<typeof getAuth>;
