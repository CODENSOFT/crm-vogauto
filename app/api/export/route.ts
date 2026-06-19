import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import connectDB from "@/lib/mongodb";
import Car from "@/models/Car";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// GET /api/export — ADMIN ONLY. Generează .xlsx cu toate vânzările.
export async function GET(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await connectDB();
  const cars = await Car.find({ isDeleted: false }).sort({ saleDate: -1 }).lean();

  const wb = new ExcelJS.Workbook();
  wb.creator = "VOGAUTO";
  const ws = wb.addWorksheet("Vânzări");

  ws.columns = [
    { header: "Client", key: "clientName", width: 20 },
    { header: "Telefon", key: "clientPhone", width: 16 },
    { header: "Marcă", key: "brand", width: 14 },
    { header: "Model", key: "model", width: 16 },
    { header: "An", key: "year", width: 8 },
    { header: "VIN", key: "vin", width: 20 },
    { header: "Culoare", key: "color", width: 12 },
    { header: "Preț cumpărare", key: "priceBuy", width: 16 },
    { header: "Preț vânzare", key: "priceSell", width: 16 },
    { header: "Profit", key: "profit", width: 14 },
    { header: "Plată", key: "paymentMethod", width: 12 },
    { header: "Vânzător", key: "soldByName", width: 20 },
    { header: "Data", key: "saleDate", width: 18 },
    { header: "Note", key: "notes", width: 30 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };

  for (const c of cars) {
    ws.addRow({
      clientName: c.clientName,
      clientPhone: c.clientPhone,
      brand: c.brand,
      model: c.model,
      year: c.year,
      vin: c.vin,
      color: c.color ?? "",
      priceBuy: Number(c.priceBuy),
      priceSell: Number(c.priceSell),
      profit: Number(c.priceSell) - Number(c.priceBuy),
      paymentMethod: c.paymentMethod,
      soldByName: c.soldByName ?? "",
      saleDate: new Date(c.saleDate).toLocaleDateString("ro-RO"),
      notes: c.notes ?? "",
    });
  }
  ["priceBuy", "priceSell", "profit"].forEach((k) => {
    ws.getColumn(k).numFmt = '#,##0.00 "€"';
  });

  const buffer = await wb.xlsx.writeBuffer();

  await logAction({
    userId: user.id,
    userName: user.fullName,
    action: "DOWNLOAD_EXCEL",
    details: { count: cars.length },
    request,
    coords: coordsOf(user),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="vanzari_${Date.now()}.xlsx"`,
    },
  });
}
