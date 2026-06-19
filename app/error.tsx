"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-base font-bold text-white">
        !
      </div>
      <h1 className="mt-6 text-lg font-semibold text-slate-800">
        A apărut o eroare
      </h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ceva nu a funcționat. Încercați din nou sau reveniți mai târziu.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Reîncearcă
      </button>
    </div>
  );
}
