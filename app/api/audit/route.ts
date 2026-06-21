import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import { requireAdmin } from "@/lib/guard";
import { escapeRegex } from "@/lib/utils";

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

  await connectDB();
  const query: Record<string, unknown> = {};
  if (action) query.action = action;
  if (userName) query.userName = { $regex: escapeRegex(userName), $options: "i" };
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo + "T23:59:59");
    query.createdAt = range;
  }

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return NextResponse.json({
    logs: logs.map((l) => ({ ...l, _id: String(l._id), userId: l.userId ? String(l.userId) : null })),
    total,
    page,
    pageSize,
  });
}
