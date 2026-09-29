"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconCube, IconTasks, IconChart, IconWarning, IconEye, IconShield } from "@/components/ui/Icons";

/** Un avantaj al sistemului, listat în panoul de prezentare. */
function Feature({ Icon, title, text }: { Icon: (p: { className?: string }) => JSX.Element; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-light ring-1 ring-inset ring-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs leading-relaxed text-slate-400">{text}</span>
      </span>
    </li>
  );
}

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-auth-gradient px-4 py-8">
      {/* Halouri discrete, ca fundalul să nu fie plat. */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative grid w-full max-w-4xl animate-scale-in overflow-hidden rounded-2xl shadow-elevated ring-1 ring-white/10 lg:grid-cols-2">
        {/* Panoul de prezentare — doar pe ecrane late. */}
        <div className="hidden flex-col justify-between bg-sidebar-gradient p-10 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow ring-1 ring-white/20">
                VA
              </span>
              <span>
                <span className="block text-lg font-bold tracking-tight text-white">VOGAUTO</span>
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Management auto</span>
              </span>
            </div>

            <h2 className="mt-10 text-2xl font-bold leading-snug tracking-tight text-white">
              Toată parcarea,<br />într-un singur loc.
            </h2>

            <ul className="mt-8 flex flex-col gap-5">
              <Feature Icon={IconCube} title="Stoc și cheltuieli"
                text="Mașinile în pregătire, costurile fiecăreia și adaosul real." />
              <Feature Icon={IconTasks} title="Sarcini și notificări"
                text="Angajații primesc sarcinile pe Telegram și le închid de acolo." />
              <Feature Icon={IconChart} title="Profit net, la zi"
                text="Preț vânzare minus cumpărare, taxă și cheltuieli — automat." />
            </ul>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <IconShield className="h-3.5 w-3.5" />
            Acces securizat · fiecare acțiune e înregistrată
          </p>
        </div>

        {/* Formularul. */}
        <div className="bg-white p-8 sm:p-10">
          {/* Sigla apare deasupra formularului doar pe ecrane mici. */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow">
              VA
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-slate-900">VOGAUTO</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Management auto</span>
            </span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">Bine ai venit</h1>
          <p className="mt-1 text-sm text-slate-500">Autentifică-te ca să continui.</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <Input
              ref={userRef}
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

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Parolă"
                placeholder="••••••••"
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

          <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            Conturile sunt create exclusiv de administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
