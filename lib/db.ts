import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";

// Reutilizăm conexiunea între reload-uri (Next.js dev) și între invocările
// serverless (Vercel), ca să nu deschidem conexiuni multiple către Postgres.
declare global {
  // eslint-disable-next-line no-var
  var _pg: ReturnType<typeof postgres> | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Lipsește DATABASE_URL din variabilele de mediu.");
  }
  // `prepare: false` este obligatoriu cu pooler-ul Supabase în mod „transaction"
  // (port 6543), care nu suportă prepared statements.
  return postgres(url, { prepare: false });
}

const client = global._pg ?? makeClient();
if (process.env.NODE_ENV !== "production") global._pg = client;

export const db = drizzle(client, { schema });
export { schema };
export default db;
