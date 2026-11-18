import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

class SuspendedAccount extends CredentialsSignin {
  code = "suspended";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              entity: "User",
              entityId: user.id,
              action: "LOGIN_FAILED",
              detail: JSON.stringify({ email }),
            },
          });
          return null;
        }

        if (user.status !== "ACTIVE") {
          throw new SuspendedAccount();
        }

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }),
          prisma.auditLog.create({
            data: {
              userId: user.id,
              entity: "User",
              entityId: user.id,
              action: "LOGIN",
              detail: JSON.stringify({ email, role: user.role }),
            },
          }),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          title: user.title,
          sessionEpoch: user.sessionEpoch,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.sessionEpoch = user.sessionEpoch;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = typeof token.role === "string" ? token.role : "";
        session.user.sessionEpoch =
          typeof token.sessionEpoch === "number" ? token.sessionEpoch : 0;
      }
      return session;
    },
  },
});
