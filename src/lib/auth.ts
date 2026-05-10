import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { getDb, schema } from "../db/client";
import type { Bindings } from "../../worker-configuration";

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

  const baseURL =
    env.FRONTEND_URL.replace(/\/$/, "") + "/api/auth";

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
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        await resend.emails.send({
          from: "rosendo@atlasstudio.dev",
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
          from: "rosendo@atlasstudio.dev",
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
