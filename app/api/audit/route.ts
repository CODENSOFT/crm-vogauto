import { NextResponse } from "next/server";
import { and, eq, ilike, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/schema";
import { requireAdmin } from "@/lib/guard";
import { escapeLike } from "@/lib/utils";
import { auditToDTO } from "@/lib/serialize";

// GET /api/audit — ADMIN ONLY. Paginare 50 + filtre.
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 50;
  const action = searchParams.get("action")?.trim();
  const userName = searchParams.get("user")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const conds = [];
  if (action) conds.push(eq(auditLogs.action, action));
  if (userName) conds.push(ilike(auditLogs.userName, `%${escapeLike(userName)}%`));
  if (dateFrom) conds.push(gte(auditLogs.createdAt, new Date(dateFrom)));
  if (dateTo) conds.push(lte(auditLogs.createdAt, new Date(dateTo + "T23:59:59")));
  const where = conds.length ? and(...conds) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(where);

  const logs = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    logs: logs.map(auditToDTO),
    total: count,
    page,
    pageSize,
  });
}
