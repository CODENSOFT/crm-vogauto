"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Utilizator sau parolă incorecte.");
      toast.error("Autentificare eșuată");
      setLoading(false);
      return;
    }

    toast.success("Autentificare reușită");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-auth-gradient px-4">
      {/* Elemente decorative discrete. */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative w-full max-w-md animate-scale-in rounded-2xl border border-white/10 bg-white p-8 shadow-elevated">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-bold text-white shadow-glow ring-1 ring-white/20">
            VA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">VOGAUTO</h1>
          <p className="mt-1 text-sm text-slate-500">Autentificare în sistem</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="username"
            type="text"
            label="Utilizator"
            placeholder="ex: admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
          <Input
            id="password"
            type="password"
            label="Parolă"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-1 w-full">
            Autentificare
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Conturile sunt create exclusiv de administrator.
        </p>
      </div>
    </div>
  );
}
