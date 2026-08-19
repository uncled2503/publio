import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { AuthService } from "@/server/services/auth-service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth.js v5 config. Session strategy is JWT — required for the Credentials
 * provider (NextAuth does not create database sessions for it) and it also
 * means the worker process never needs to touch session storage.
 *
 * This is authentication for Publio itself. It is entirely separate from
 * the Meta/Instagram OAuth flow in src/server/instagram — never conflate
 * the two (see docs/instagram-oauth.md).
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const user = await AuthService.verifyCredentials(parsed.data.email, parsed.data.password);
        if (!user) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
