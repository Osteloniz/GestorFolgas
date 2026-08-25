import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

import { getTrustedOrigins } from "./trusted-origins";

type AuthFactoryOptions = {
  allowSignUp?: boolean;
};

export function createAuth({ allowSignUp = false }: AuthFactoryOptions = {}) {
  const trustedOrigins = getTrustedOrigins();

  return betterAuth({
    appName: "Gestão de Compensações",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
    },
    advanced: {
      cookiePrefix: "gestao_folga",
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    plugins: [
      twoFactor({
        issuer: "Gestão de Compensações",
        skipVerificationOnEnable: true,
      }),
    ],
  });
}

export const auth = createAuth();
