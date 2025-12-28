import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import LinkedIn from "next-auth/providers/linkedin";
import Facebook from "next-auth/providers/facebook";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID!,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (!account?.provider) return false;

      const provider = account.provider;
      const providerId = profile?.sub || profile?.id;
      if (!providerId) return false;

      const now = new Date();

      // Map provider to database column
      const providerIdField = {
        google: 'googleId',
        github: 'githubId',
        linkedin: 'linkedinId',
        facebook: 'facebookId',
      }[provider] as 'googleId' | 'githubId' | 'linkedinId' | 'facebookId' | undefined;

      if (!providerIdField) return false;

      // Check if user exists by provider ID
      const [existingByProvider] = await db
        .select()
        .from(users)
        .where(eq(users[providerIdField], providerId))
        .limit(1);

      if (existingByProvider) {
        // Update existing user
        await db
          .update(users)
          .set({
            email: user.email,
            name: user.name ?? existingByProvider.name,
            picture: user.image ?? existingByProvider.picture,
            updatedAt: now,
          })
          .where(eq(users.id, existingByProvider.id));
        return true;
      }

      // Check if user exists by email
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingByEmail) {
        // Link provider account to existing user
        await db
          .update(users)
          .set({
            [providerIdField]: providerId,
            name: user.name ?? existingByEmail.name,
            picture: user.image ?? existingByEmail.picture,
            updatedAt: now,
          })
          .where(eq(users.id, existingByEmail.id));
        return true;
      }

      // Create new user
      await db.insert(users).values({
        email: user.email,
        name: user.name,
        picture: user.image,
        [providerIdField]: providerId,
        createdAt: now,
        updatedAt: now,
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        // Fetch user from database by email to get the actual user ID
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, session.user.email))
          .limit(1);

        if (dbUser) {
          session.user.id = dbUser.id;
        }
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

// Helper to get the current user ID from session
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Helper to require authentication
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

