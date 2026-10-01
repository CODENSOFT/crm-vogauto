// Șablonul de descriere pentru anunțuri (credit/leasing/schimb).
// Textele stau aici, într-un singur loc, ca să poată fi schimbate ușor.

/** Rata lunară = preț × acest coeficient. Din exemplul parcării: 735 € la 34 999 €. */
const MONTHLY_RATE = Number(process.env.FINANCE_MONTHLY_RATE || 0.021);
/** Termenul maxim de finanțare, în luni. */
const MAX_MONTHS = Number(process.env.FINANCE_MAX_MONTHS || 60);

const STOCK_URL = process.env.COMPANY_STOCK_URL || "https://vogauto.md/";
const ADDRESS = process.env.COMPANY_ADDRESS || "or.Chișinău str.Lunca Bîcului 21";
const MAP_URL = process.env.COMPANY_MAP_URL || "https://g.co/kgs/bsPo7GB";

function eur(n: number): string {
  try {
    return new Intl.NumberFormat("ro-RO").format(Math.round(n)) + " €";
  } catch {
    return `${Math.round(n)} €`;
  }
}

/**
 * Descrierea standard, cu prețul mașinii completat automat.
 * Rămâne editabilă înainte de publicare.
 */
export function buildDescriptionTemplate(price: number): string {
  const monthly = price > 0 ? eur(price * MONTHLY_RATE) : "—";
  const years = Math.round(MAX_MONTHS / 12);

  return `CREDIT / LEASING / SCHIMB

Toate ofertele de tip schimb se discută individual

Costul total al automobilului – ${eur(price)}
Prima rată - !!! 0 € !!!
Soldul rămas în credit - ${eur(price)}
Lunar – ${monthly}

TERMEN DE FINANȚARE PÎNĂ LA ${MAX_MONTHS} LUNI (${years} ANI)

CREDIT:
- Aprobare 100% (chiar dacă lucrați neoficial sau peste hotare)
- Primiți decizia în 15 minute
- Fără prima rată pînă la 50.000 €
- Lucrăm cu toate organizațiile de finanțare bancare și nebancare din Moldova

Automobilele disponibile in stock : ${STOCK_URL}

Ne aflăm : ${ADDRESS}
Locația: ${MAP_URL}

Vă așteptăm !!!`;
}
