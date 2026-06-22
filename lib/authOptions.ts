import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { logAction } from "@/lib/audit";
import { isRateLimited, registerFailure, clearFailures } from "@/lib/rateLimit";

// Notă: NEXTAUTH_SECRET este obligatoriu în producție — NextAuth însuși refuză
// să pornească fără el la runtime. Nu îl verificăm la import, ca să nu blocăm
// build-ul (variabilele pot lipsi în faza de build).
const useSecureCookies =
  (process.env.NEXTAUTH_URL ?? "").startsWith("https://") ||
  process.env.NODE_ENV === "production";

// Re-validăm token-ul față de baza de date cel mult o dată la acest interval,
// ca un cont dezactivat/șters/cu rol schimbat să-și piardă accesul aproape
// imediat, nu abia după expirarea JWT-ului.
const REVALIDATE_MS = 30 * 1000;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 }, // 1 oră
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies,
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

        // Protecție anti-brute-force: blocăm temporar după prea multe eșecuri.
        const rawHeaders = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const hv = (name: string): string => {
          const v = rawHeaders[name] ?? rawHeaders[name.toLowerCase()];
          return (Array.isArray(v) ? v[0] : v) || "";
        };
        const ip =
          hv("x-forwarded-for").split(",")[0].trim() || hv("x-real-ip") || "unknown";
        const rlKey = `${ip}:${username}`;
        const blockedFor = isRateLimited(rlKey);
        if (blockedFor > 0) {
          await logAction({
            userId: null,
            userName: username,
            action: "LOGIN_FAILED",
            details: { reason: "rate_limited", username, retryAfterSec: blockedFor },
            request: headerSrc,
            coords: null,
          });
          throw new Error("Prea multe încercări. Încercați din nou mai târziu.");
        }

        // Coordonate GPS din browser (dacă utilizatorul a permis locația).
        const latN = credentials?.lat ? Number(credentials.lat) : NaN;
        const lonN = credentials?.lon ? Number(credentials.lon) : NaN;
        const coords = !isNaN(latN) && !isNaN(lonN) ? { lat: latN, lon: lonN } : null;

        await connectDB();
        const user = await User.findOne({ username });

        if (!user || !user.isActive) {
          registerFailure(rlKey);
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
          registerFailure(rlKey);
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

        // Autentificare reușită — resetăm contorul anti-brute-force.
        clearFailures(rlKey);

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
          fixedFee: user.fixedFee ?? 50,
          bonus: user.bonus ?? 0,
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
          fixedFee: number;
          bonus: number;
          permissions: Record<string, boolean>;
          lat?: number;
          lon?: number;
        };
        token.id = u.id;
        token.username = u.username;
        token.role = u.role;
        token.fullName = u.fullName;
        token.fixedFee = u.fixedFee;
        token.bonus = u.bonus;
        token.permissions = u.permissions;
        token.lat = u.lat;
        token.lon = u.lon;
        token.checkedAt = Date.now();
        return token;
      }

      // La cererile ulterioare, re-validăm periodic față de DB: dacă utilizatorul
      // a fost șters sau dezactivat → invalidăm sesiunea; dacă rolul/datele s-au
      // schimbat → le actualizăm live (ex: degradare admin → angajat).
      const last = (token.checkedAt as number) ?? 0;
      if (token.id && Date.now() - last > REVALIDATE_MS) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id)
            .select("role isActive fullName fixedFee bonus username permissions")
            .lean();
          if (!dbUser || !dbUser.isActive) {
            // Token gol → sesiunea devine invalidă, utilizatorul e deconectat.
            return {};
          }
          token.role = dbUser.role;
          token.fullName = dbUser.fullName;
          token.username = dbUser.username;
          token.fixedFee = dbUser.fixedFee ?? 50;
          token.bonus = dbUser.bonus ?? 0;
          token.permissions = dbUser.permissions as unknown as Record<string, boolean>;
          token.checkedAt = Date.now();
        } catch {
          // Eroare DB — nu invalidăm sesiunea pe baza unei erori tranzitorii.
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Token invalidat (cont dezactivat/șters) → sesiune fără identitate.
      if (session.user && token?.id) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.fullName = token.fullName as string;
        session.user.fixedFee = (token.fixedFee as number) ?? 50;
        session.user.bonus = (token.bonus as number) ?? 0;
        session.user.permissions = token.permissions as Record<string, boolean>;
        session.user.lat = token.lat as number | undefined;
        session.user.lon = token.lon as number | undefined;
      } else if (session.user) {
        // Fără id valid → consumatorii (guard/layout) vor respinge accesul.
        session.user = undefined as unknown as typeof session.user;
      }
      return session;
    },
  },
};
