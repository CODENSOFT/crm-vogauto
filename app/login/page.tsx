"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { IconWarning, IconEye, IconLock, IconUser } from "@/components/ui/Icons";

const FIELD =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-11 text-[15px] text-slate-900 transition-all placeholder:text-slate-400 outline-none focus:border-brand/50 focus:bg-white focus:ring-4 focus:ring-brand/10";

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

  const ready = Boolean(username.trim() && password);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-auth-gradient px-4 py-10">
      {/* Lumini difuze, pentru adâncime. */}
      <div className="vg-orb pointer-events-none absolute -left-48 -top-32 h-[34rem] w-[34rem] rounded-full bg-brand/25 blur-[120px]" />
      <div className="vg-orb vg-orb-2 pointer-events-none absolute -bottom-52 -right-40 h-[34rem] w-[34rem] rounded-full bg-indigo-500/25 blur-[120px]" />
      <div className="vg-orb vg-orb-3 pointer-events-none absolute left-1/3 top-1/2 h-[22rem] w-[22rem] rounded-full bg-sky-400/15 blur-[100px]" />

      {/* Chenar în degrade: un strat de 1px sub card. */}
      <div className="vg-rise relative w-full max-w-md rounded-[1.75rem] bg-gradient-to-br from-white/50 via-white/15 to-white/5 p-px shadow-2xl">
        <div className="vg-grain relative overflow-hidden rounded-[1.7rem] bg-white/95 p-9 backdrop-blur-xl sm:p-10">
        <div className="relative flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-bold tracking-tight text-white shadow-lg shadow-brand/40 ring-1 ring-white/30">
            VA
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            VOGAUTO
          </h1>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Sistem intern
          </p>
        </div>

        <form onSubmit={handleSubmit} className="vg-rise relative mt-8 flex flex-col gap-5" style={{ animationDelay: "90ms" }}>
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Utilizator
            </label>
            <div className="relative">
              <IconUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Parolă
            </label>
            <div className="relative">
              <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                onBlur={() => setCapsLock(false)}
                required
                autoComplete="current-password"
                className={`${FIELD} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                title={showPassword ? "Ascunde parola" : "Arată parola"}
                className={`absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${showPassword ? "bg-brand-tint text-brand" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <IconEye className="h-4 w-4" />
              </button>
            </div>
            {capsLock && (
              <span className="text-xs font-medium text-amber-600">Caps Lock este pornit.</span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !ready}
            className="vg-shine mt-1 flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:shadow-xl hover:shadow-brand/40 hover:brightness-[1.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:brightness-100"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading ? "Se verifică..." : "Autentificare"}
          </button>
        </form>
        </div>
      </div>

      <p className="vg-rise relative mt-7 text-xs text-slate-500" style={{ animationDelay: "180ms" }}>
        © {new Date().getFullYear()} VOGAUTO
      </p>
    </div>
  );
}
