// Adresa Graph API a Meta, într-un singur loc.
//
// Meta scoate versiunile cam doi ani după lansare, iar Facebook și Instagram
// merg prin aceeași poartă. Ținându-le aici, versiunea se urcă dintr-o
// variabilă de mediu, fără o nouă publicare de cod, și nu există riscul ca
// una din cele două să rămână pe o versiune veche.

const HOST = process.env.META_API_HOST || "https://graph.facebook.com";

/** Versiunea de API. Se poate urca fără modificarea codului. */
export const META_API_VERSION = process.env.META_API_VERSION || "v23.0";

/** Adresa de bază, fără „/" la final. */
export const META_BASE = `${HOST}/${META_API_VERSION}`;
