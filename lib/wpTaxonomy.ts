// Maparea valorilor din CRM pe taxonomiile anunțurilor de pe vogauto.md.
//
// Site-ul folosește tipul de conținut `listing` cu 12 taxonomii proprii. Id-urile
// de mai jos sunt cele reale, citite din API-ul lor. Regula de aur: NU creăm
// termeni noi — dacă o valoare nu are corespondent, lăsăm taxonomia necompletată,
// ca să nu modificăm structura site-ului.

/** Taxonomiile cu liste scurte și fixe: mapare directă, fără interogări. */
const FUEL: Record<string, number> = {
  "Benzină": 131,
  "Diesel (motorină)": 85,
  "Benzină + GPL": 111,            // Gaz-Benzin (Propan)
  "Benzină + Metan": 276,          // Gaz-Benzin (Metan)
  "Mild Hybrid (Benzină)": 110,    // ei au un singur „Hybrid"
  "Mild Hybrid (Diesel)": 110,
  "Hibrid (Benzină)": 110,
  "Hibrid (Diesel)": 110,
  "Plug-In Hybrid (Benzină)": 274, // Plug-In Hybrid (Benzin)
  "Plug-In Hybrid (Diesel)": 275,
  "Electric": 91,
};

const TRANSMISSION: Record<string, number> = {
  "Manuală": 120,
  "Automată": 57,
  "Robotizată": 82,
  "Variator (CVT)": 81,
};

const DRIVE: Record<string, number> = {
  "Tracțiune față": 98,                   // FWD
  "Tracțiune spate": 142,                 // RWD
  "Tracțiune integrală (AWD/4x4)": 51,    // AWD/4x4
};

const CONDITION: Record<string, number> = {
  "Nou": 124,
  "Cu parcurs": 170,
  "Accidentat": 170, // ei nu au termen separat; cel mai apropiat
};

// Ei au doar 3, 5 și 6 uși — rotunjim la varianta existentă.
const DOORS: Record<string, number> = {
  "2 Uși": 33,
  "3 Uși": 33,
  "4 Uși": 37,
  "5 Uși": 37,
};

const BODY: Record<string, number> = {
  "Crossover": 698,
  "SUV": 153,
  "Sedan": 148,
  "Hatchback": 104,
  "Break (Universal)": 244,
  "Coupe": 80,
  "Cabriolet": 77,       // Decapotabilă
  "Minivan": 171,        // Van
  "Pickup": 775,
  "Van / Furgon": 171,
};

const COLOR: Record<string, number> = {
  alb: 178, albastru: 62, argintiu: 150, auriu: 102, bej: 750, bordo: 277,
  galben: 281, gri: 278, maro: 751, negru: 61, "roșu": 143, rosu: 143,
  roz: 133, verde: 280, violet: 282, "nardo grey": 279,
};

/** Valori implicite pentru un anunț de mașină pus în vânzare de parcare. */
export const DEFAULTS = {
  listing_category: 71,    // Autoturism
  listing_offer_type: 149, // Vând
  listing_label: 781,      // În Stoc
} as const;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Caută valoarea în hartă, întâi exact, apoi fără diferențe de literă mare. */
function pick(map: Record<string, number>, value?: string | null): number | undefined {
  if (!value) return undefined;
  if (map[value] !== undefined) return map[value];
  const n = norm(value);
  for (const [k, v] of Object.entries(map)) if (norm(k) === n) return v;
  return undefined;
}

export interface TaxonomyInput {
  brand?: string | null;
  model?: string | null;
  bodyType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  driveType?: string | null;
  condition?: string | null;
  doors?: string | null;
  color?: string | null;
}

/** Taxonomiile care se pot decide fără să întrebăm site-ul. */
export function staticTerms(c: TaxonomyInput): Record<string, number[]> {
  const out: Record<string, number[]> = {
    listing_category: [DEFAULTS.listing_category],
    listing_offer_type: [DEFAULTS.listing_offer_type],
    listing_label: [DEFAULTS.listing_label],
  };
  const add = (tax: string, id?: number) => { if (id !== undefined) out[tax] = [id]; };
  add("listing_fuel_type", pick(FUEL, c.fuelType));
  add("listing_transmission", pick(TRANSMISSION, c.transmission));
  add("listing_drive_type", pick(DRIVE, c.driveType));
  add("listing_condition", pick(CONDITION, c.condition));
  add("listing_door", pick(DOORS, c.doors));
  add("listing_type", pick(BODY, c.bodyType));
  add("listing_color", pick(COLOR, c.color ? norm(c.color) : null));
  return out;
}

/** Marca și modelul au liste lungi, deci le căutăm în site (rezultatul se ține în memorie). */
export const LOOKUP_TAXONOMIES = ["listing_make", "listing_model"] as const;
