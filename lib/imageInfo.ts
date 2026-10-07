// Dimensiunile unei imagini, citite din primii octeți ai fișierului.
//
// Instagram refuză imaginile prea înguste sau prea late, iar dacă una singură
// e respinsă, cade întreaga postare. Le măsurăm înainte, ca să le putem lăsa
// deoparte pe cele nepotrivite în loc să pierdem tot.

/** Lățime și înălțime, sau null dacă formatul nu e recunoscut. */
export function dimensiuni(buf: Buffer): { w: number; h: number } | null {
  // JPEG: căutăm markerul SOF, unde stau dimensiunile.
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  // PNG: dimensiunile stau în blocul IHDR, la poziție fixă.
  if (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // WebP (VP8X): tot la poziție fixă, pe 24 de biți, minus unu.
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    if (buf.toString("ascii", 12, 16) === "VP8X") {
      return {
        w: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
        h: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
      };
    }
  }
  return null;
}

/**
 * Măsoară o imagine după adresa ei, descărcând doar începutul fișierului.
 * Întoarce null dacă nu se poate citi — atunci o lăsăm să treacă, ca să nu
 * aruncăm o poză bună din cauza unei erori de rețea.
 */
export async function masoaraImagine(url: string): Promise<{ w: number; h: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-65535" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok && res.status !== 206) return null;
    return dimensiuni(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

/** Limitele Instagram pentru raportul lățime/înălțime. */
export const IG_RAPORT_MIN = 0.8;   // 4:5, portret
export const IG_RAPORT_MAX = 1.91;  // peisaj
/** Sub această lățime, Instagram refuză imaginea. */
export const IG_LATIME_MIN = 320;

/** Ar accepta Instagram această imagine? */
export function potrivitaPentruInstagram(d: { w: number; h: number } | null): boolean {
  if (!d || !d.h) return true; // nemăsurabilă: o lăsăm, decide Instagram
  const r = d.w / d.h;
  return d.w >= IG_LATIME_MIN && r >= IG_RAPORT_MIN && r <= IG_RAPORT_MAX;
}
