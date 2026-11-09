import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { rawDb } from "./db";
import { linkInvites } from "./projects";

export const auth = betterAuth({
  // No `client` passed: transactions stay off, so a standalone (non-replica-set) MongoDB works.
  database: mongodbAdapter(rawDb()),
  // Admin login origin. Separate from PUBLIC_URL (what Telegram calls), so a dev https tunnel for the bot
  // doesn't change the Google OAuth redirect URI used on localhost.
  baseURL: process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      prompt: "select_account",
    },
  },
  user: {
    additionalFields: {
      banned: { type: "boolean", defaultValue: false, input: false },
    },
  },
  // Session cookie cache stays disabled (default): a ban must take effect on the very next request.
  databaseHooks: {
    user: {
      create: {
        // Only Google-verified emails: invites and admin rights are matched by email.
        before: async (user) => (user.emailVerified ? undefined : false),
      },
    },
    session: {
      create: {
        before: async (session, ctx) => {
          const user = await ctx?.context.internalAdapter.findUserById(session.userId);
          if (user && (user as { banned?: boolean }).banned) return false;
        },
        after: async (session, ctx) => {
          const user = await ctx?.context.internalAdapter.findUserById(session.userId);
          if (user?.email) await linkInvites(user.id, user.email);
        },
      },
    },
  },
  // Sign-in is Google only, but the endpoints are still public: keep bursts of attempts down (per IP, in memory).
  rateLimit: { enabled: true, window: 60, max: 60, customRules: { "/sign-in/social": { window: 60, max: 10 }, "/callback/*": { window: 60, max: 20 } } },
  plugins: [nextCookies()],
});
