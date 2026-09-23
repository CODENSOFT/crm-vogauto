import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /** Ce returnează `authorize()` și ce primește callback-ul `jwt`. */
  interface User {
    id: string;
    username: string;
    email?: string | null;
    fullName: string;
    role: string;
    fixedFee: number;
    bonus: number;
    permissions: Record<string, boolean>;
    lat?: number;
    lon?: number;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email?: string;
      fullName: string;
      role: string;
      fixedFee: number;
      bonus: number;
      permissions: Record<string, boolean>;
      lat?: number;
      lon?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
    fullName?: string;
    fixedFee?: number;
    bonus?: number;
    permissions?: Record<string, boolean>;
    lat?: number;
    lon?: number;
    // Marcaj de timp al ultimei re-validări față de baza de date.
    checkedAt?: number;
  }
}
