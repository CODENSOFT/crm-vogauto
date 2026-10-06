import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { financeFor } from "@/lib/listingTemplate";

// GET /print/inventory/[id] — fișa A4 (orizontală) a mașinii, pentru tipar.
//
// Întoarce un document HTML complet, nu o pagină din panou: foaia are propriile
// reguli de pagină (@page A4 landscape, margini zero) și propriul font, iar
// aranjarea CRM-ului n-are ce căuta în ea.
export const dynamic = "force-dynamic";

/** Numerele de telefon din josul foii. */
const PHONES = process.env.PRINT_PHONES || "+373 67 260003 / +373 67 800003";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Tracțiunea, scurtată pentru foaie: „Tracțiune: Tracțiune integrală (AWD/4x4)"
 * repeta cuvântul și ocupa un rând întreg la 32pt.
 */
function tractiune(v?: string | null): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (/integral/i.test(s)) return "Integrală 4x4";
  if (/fa(t|ț)[aă]/i.test(s)) return "Față";
  if (/spate/i.test(s)) return "Spate";
  return s.replace(/^Trac(t|ț)iune\s*/i, "");
}

/** „ALBASTRU" → „Albastru". Pe o foaie tipărită, majusculele strigă. */
function titlu1(v?: string | null): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** 163000 → „163.000"; gol dacă nu e număr. */
function nr(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("ro-RO").format(Math.round(n));
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;

  if (!isUuid(params.id)) {
    return new Response("Mașina nu a fost găsită.", { status: 404 });
  }
  const [car] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!car || car.isDeleted) {
    return new Response("Mașina nu a fost găsită.", { status: 404 });
  }

  const titlu = `${car.brand} ${car.model}`.trim();
  const motor = [nr(car.engine) && `${nr(car.engine)} cm³`, car.fuelType].filter(Boolean).join(" – ");

  // Rândurile necompletate se omit: o foaie cu „An: —" arată neterminată.
  const specs: [string, string][] = [
    ["An", car.year ? String(car.year) : ""],
    ["Cutie", car.transmission ?? ""],
    ["Tracțiune", tractiune(car.driveType)],
    ["Culoare", titlu1(car.color)],
    ["Parcurs", nr(car.mileage) ? `${nr(car.mileage)} km` : ""],
    ["Motorizare", motor],
  ];
  const specsHtml = specs
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `    <p>${esc(k)}: ${esc(v)}</p>`)
    .join("\n");

  const pret = Number(car.sellPrice) || 0;
  // Aceeași rată ca în textul de credit și pe site: o altă cifră pe foaie ar
  // însemna două răspunsuri diferite la aceeași întrebare a clientului.
  const lunar = financeFor(pret).monthly.replace(/\s*€$/, "");

  const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fișă ${esc(titlu)}</title>
<style>
  /* Dimensiunile scrise explicit, nu cuvântul „landscape": unele browsere
     ignoră cuvântul, dar respectă măsurile. Marginea zero scoate antetul și
     subsolul pe care le adaugă browserul (adresa, data, numărul paginii). */
  @page { size: 297mm 210mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #e5e5e5; }
  body { font-family: "Times New Roman", Times, serif; font-weight: bold; color: #111; }
  .bara {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    display: flex; gap: 10px; align-items: center; justify-content: center;
    padding: 8px; background: #111; color: #fff;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-weight: 500; font-size: 13px;
  }
  .bara button {
    font: inherit; font-weight: 600; cursor: pointer;
    border: 0; border-radius: 6px; padding: 6px 14px; background: #2563eb; color: #fff;
  }
  .bara span { opacity: .75; }
  .page {
    width: 297mm; height: 210mm; margin: 10mm auto; background: #fff;
    padding: 10mm 16mm 9mm; display: flex; flex-direction: column;
    box-shadow: 0 2px 12px rgba(0,0,0,.2); overflow: hidden;
  }
  .logo { display: block; width: 100mm; margin: 0 auto 4mm; }
  h1 { text-align: center; font-size: 50pt; margin: 0 0 5mm; line-height: 1.1; }
  .specs { padding-left: 5mm; }
  .specs p { font-size: 32pt; margin: 0 0 1.8mm; line-height: 1.15; }
  .price-row { display: flex; justify-content: space-between; align-items: baseline;
    padding-left: 5mm; margin: 3mm 0 4mm; }
  .price { font-size: 44pt; }
  .monthly { font-size: 38pt; }
  .red { color: #C0272D; }
  .slogan { text-align: center; font-size: 42pt; margin: 0 0 1.5mm; }
  .phones { text-align: center; font-size: 22pt; margin: 0; }
  [contenteditable]:hover { outline: 1px dashed #bbb; }
  @media print {
    /* „overflow: hidden" și înălțimea exactă opresc a doua foaie goală: fără
       ele, orice rest de spațiu de după foaie (chiar și un rând gol invizibil)
       trece pe pagina următoare. */
    html, body {
      width: 297mm; height: 210mm; margin: 0; padding: 0;
      background: #fff; overflow: hidden;
    }
    /* Nimic în afară de foaie nu ajunge pe hârtie. */
    body > *:not(.page) { display: none !important; }
    .page {
      width: 297mm; height: 210mm; margin: 0; box-shadow: none;
      overflow: hidden; break-inside: avoid; page-break-inside: avoid;
    }
    [contenteditable]:hover { outline: none; }
  }
  /* Fără asta, browserele scot culorile la tipar, iar prețul roșu iese gri. */
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body><div class="bara">
  <button type="button" onclick="window.print()">Printează</button>
  <span>Poți corecta orice text direct pe foaie. Dacă browserul tot pune data și
  adresa jos, în fereastra de tipar: Mai multe setări → scoate bifa de la
  „Antete și subsoluri”.</span>
</div><div class="page" contenteditable="true" spellcheck="false">
  <img class="logo" src="/logo-vogauto.png" alt="VOG Auto">
  <h1>Marca: ${esc(titlu)}</h1>
  <div class="specs">
${specsHtml}
  </div>
  <div class="price-row">
    <div class="price">Preț: <span class="red">${esc(nr(pret))}</span>€</div>
    <div class="monthly"><span class="red">${esc(lunar)}</span> € /Lunar</div>
  </div>
  <p class="slogan">Credit-Leasing-Schimb</p>
  <p class="phones">Manageri Vânzări : ${esc(PHONES)}</p>
</div></body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
