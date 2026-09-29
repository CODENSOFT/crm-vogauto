"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconWarning, IconEye } from "@/components/ui/Icons";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<HTMLInputElement>(null);

  // Cursorul începe în primul câmp, ca să se poată tasta direct.
  useEffect(() => { userRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (!res?.ok || res.error) {
      setError("Utilizator sau parolă incorecte.");
      toast.error("Autentificare eșuată");
      setLoading(false);
      return;
    }

    toast.success("Autentificare reușită");

    // Navigare completă (nu router.push): altfel middleware-ul poate rula
    // înainte ca browserul să trimită cookie-ul de sesiune abia primit, iar
    // utilizatorul e aruncat înapoi la /login până dă refresh manual.
    const params = new URLSearchParams(window.location.search);
    const target = params.get("callbackUrl") ?? "/dashboard";
    // Doar adrese din aplicație (fără redirecturi către alte site-uri).
    const safe = target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
    window.location.assign(safe);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-gradient px-4 py-10">
      <div className="w-full max-w-sm animate-scale-in rounded-2xl bg-white p-8 shadow-elevated ring-1 ring-white/10">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow ring-1 ring-white/20">
            VA
          </span>
          <h1 className="mt-3 text-lg font-bold tracking-tight text-slate-900">VOGAUTO</h1>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Sistem intern
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            ref={userRef}
            id="username"
            type="text"
            label="Utilizator"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              label="Parolă"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
              title={showPassword ? "Ascunde parola" : "Arată parola"}
              className="absolute bottom-0 right-0 flex h-[38px] w-10 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-brand"
            >
              <IconEye className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
              <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" loading={loading} className="mt-2 w-full">
            Autentificare
          </Button>
        </form>
      </div>
    </div>
  );
}
