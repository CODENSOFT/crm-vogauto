import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { logAction } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 }, // 1 oră
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Utilizator", type: "text" },
        password: { label: "Parolă", type: "password" },
        lat: { label: "lat", type: "text" },
        lon: { label: "lon", type: "text" },
      },
      async authorize(credentials, req) {
        const headerSrc = { headers: (req?.headers ?? {}) as Record<string, string> };
        const username = credentials?.username?.toLowerCase().trim();
        const password = credentials?.password;
        if (!username || !password) return null;

        // Coordonate GPS din browser (dacă utilizatorul a permis locația).
        const latN = credentials?.lat ? Number(credentials.lat) : NaN;
        const lonN = credentials?.lon ? Number(credentials.lon) : NaN;
        const coords = !isNaN(latN) && !isNaN(lonN) ? { lat: latN, lon: lonN } : null;

        await connectDB();
        const user = await User.findOne({ username });

        if (!user || !user.isActive) {
          await logAction({
            userId: user?._id?.toString() ?? null,
            userName: username,
            action: "LOGIN_FAILED",
            details: { reason: user ? "inactive" : "unknown_user", username },
            request: headerSrc,
            coords,
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          await logAction({
            userId: user._id.toString(),
            userName: user.fullName,
            action: "LOGIN_FAILED",
            details: { reason: "bad_password", username },
            request: headerSrc,
            coords,
          });
          return null;
        }

        user.lastLogin = new Date();
        await user.save();

        await logAction({
          userId: user._id.toString(),
          userName: user.fullName,
          action: "LOGIN_SUCCESS",
          details: { username },
          request: headerSrc,
          coords,
        });

        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          commissionPercent: user.commissionPercent,
          permissions: user.permissions,
          lat: coords?.lat,
          lon: coords?.lon,
        } as unknown as import("next-auth").User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          username: string;
          role: string;
          fullName: string;
          commissionPercent: number;
          permissions: Record<string, boolean>;
          lat?: number;
          lon?: number;
        };
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.fullName = u.fullName;
        token.commissionPercent = u.commissionPercent;
        token.permissions = u.permissions;
        token.lat = u.lat;
        token.lon = u.lon;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
        session.user.commissionPercent = (token.commissionPercent as number) ?? 0;
        session.user.permissions = token.permissions as Record<string, boolean>;
        session.user.lat = token.lat as number | undefined;
        session.user.lon = token.lon as number | undefined;
      }
      return session;
    },
  },
};
