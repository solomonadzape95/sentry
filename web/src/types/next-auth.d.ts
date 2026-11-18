import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      title: string;
      sessionEpoch: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    title: string;
    sessionEpoch: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    sessionEpoch?: number;
  }
}
