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
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-base font-bold text-white">
            VA
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">VOGAUTO</h1>
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
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" loading={loading} className="w-full">
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
