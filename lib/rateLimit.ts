// Limitator simplu de încercări (în memorie) pentru protecție anti-brute-force
// la autentificare. Cheia tipică: `${ip}:${username}`.
//
// Notă: starea trăiește în memoria procesului. Pe un singur server (cazul
// acestui CRM) e suficient. Pentru mai multe instanțe ar trebui mutat în
// Redis/Mongo, dar logica rămâne aceeași.

interface Attempt {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}

const attempts = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5; // încercări eșuate permise
const WINDOW_MS = 15 * 60 * 1000; // fereastra de numărare: 15 minute
const BLOCK_MS = 15 * 60 * 1000; // durata blocării după depășire: 15 minute

// Curățare periodică a intrărilor expirate (evită creșterea nelimitată).
function sweep(now: number) {
  for (const [key, a] of attempts) {
    const expired =
      (a.blockedUntil ? a.blockedUntil < now : true) &&
      now - a.firstAt > WINDOW_MS;
    if (expired) attempts.delete(key);
  }
}

// Verifică dacă cheia e blocată. Întoarce secundele rămase (0 = nu e blocată).
export function isRateLimited(key: string): number {
  const now = Date.now();
  const a = attempts.get(key);
  if (a?.blockedUntil && a.blockedUntil > now) {
    return Math.ceil((a.blockedUntil - now) / 1000);
  }
  return 0;
}

// Înregistrează o încercare eșuată. Blochează la depășirea pragului.
export function registerFailure(key: string): void {
  const now = Date.now();
  if (Math.random() < 0.05) sweep(now); // curățare ocazională

  const a = attempts.get(key);
  if (!a || now - a.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) {
    a.blockedUntil = now + BLOCK_MS;
  }
}

// Resetează contorul după o autentificare reușită.
export function clearFailures(key: string): void {
  attempts.delete(key);
}
