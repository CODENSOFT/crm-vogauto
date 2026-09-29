"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { IconWarning, IconEye, IconLock, IconUser } from "@/components/ui/Icons";

const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 text-[15px] text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-auth-gradient px-4 py-10">
      <div className="w-full max-w-[26rem] animate-scale-in overflow-hidden rounded-xl bg-white shadow-elevated ring-1 ring-slate-900/5">
        {/* Linie subțire de accent, în locul unui antet colorat. */}
        <div className="h-1 bg-brand-gradient" />

        <div className="px-8 py-9 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-[13px] font-bold tracking-tight text-white">
              VA
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold leading-tight tracking-tight text-slate-900">VOGAUTO</span>
              <span className="block text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-400">Sistem intern</span>
            </span>
          </div>

          <div className="my-7 h-px bg-slate-100" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Utilizator
              </label>
              <div className="relative">
                <IconUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={userRef}
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={FIELD}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Parolă
              </label>
              <div className="relative">
                <IconLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  required
                  autoComplete="current-password"
                  className={`${FIELD} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  title={showPassword ? "Ascunde parola" : "Arată parola"}
                  className={`absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-lg transition-colors ${showPassword ? "text-brand" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <IconEye className="h-4 w-4" />
                </button>
              </div>
              {capsLock && (
                <span className="text-xs font-medium text-amber-600">Caps Lock este pornit.</span>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!username.trim() || !password}
              className="w-full"
            >
              Autentificare
            </Button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        © {new Date().getFullYear()} VOGAUTO
      </p>
    </div>
  );
}
