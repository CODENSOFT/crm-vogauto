import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email?: string;
      fullName: string;
      role: string;
      commissionPercent: number;
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
    commissionPercent?: number;
    permissions?: Record<string, boolean>;
    lat?: number;
    lon?: number;
  }
}
