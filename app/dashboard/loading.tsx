export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-48 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-4 h-72 rounded-lg border border-slate-200 bg-white" />
    </div>
  );
}
