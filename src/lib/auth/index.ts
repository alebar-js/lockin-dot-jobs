import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (account?.provider !== "google") return false;

      const googleId = profile?.sub;
      if (!googleId) return false;

      const now = new Date();

      // Check if user exists by googleId
      const [existingByGoogle] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId))
        .limit(1);

      if (existingByGoogle) {
        // Update existing user
        await db
          .update(users)
          .set({
            email: user.email,
            name: user.name ?? existingByGoogle.name,
            picture: user.image ?? existingByGoogle.picture,
            updatedAt: now,
          })
          .where(eq(users.id, existingByGoogle.id));
        return true;
      }

      // Check if user exists by email
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingByEmail) {
        // Link Google account to existing user
        await db
          .update(users)
          .set({
            googleId,
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
        googleId,
        createdAt: now,
        updatedAt: now,
      });

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        // Fetch user from database to get the actual user ID
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, token.sub))
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

