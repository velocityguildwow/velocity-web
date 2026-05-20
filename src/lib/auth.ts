import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and } from "drizzle-orm";
import {
  getDb,
  authUsers,
  authAccounts,
  authSessions,
  authVerificationTokens,
} from "@ravxd/velocitydb";

const db = getDb();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Replace the internal Auth.js UUID with the Discord snowflake ID
        // so session.user.id matches members.discordId and the bot's interaction.user.id
        const [account] = await db
          .select({ providerAccountId: authAccounts.providerAccountId })
          .from(authAccounts)
          .where(
            and(
              eq(authAccounts.userId, user.id),
              eq(authAccounts.provider, "discord")
            )
          )
          .limit(1);

        if (account) {
          session.user.id = account.providerAccountId;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
