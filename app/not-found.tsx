import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-base font-bold text-white">
        VA
      </div>
      <p className="mt-6 text-5xl font-bold tracking-tight text-slate-900">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-700">
        Pagina nu a fost găsită
      </h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Pagina căutată nu există sau a fost mutată.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Înapoi la panou
      </Link>
    </div>
  );
}
