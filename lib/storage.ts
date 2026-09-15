// Helper minimal pentru Supabase Storage (bucket public „car-photos"), folosind
// REST API-ul de storage cu cheia service_role (server-side only).

const BUCKET = "car-photos";

function cfg() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  return { url, key };
}

export function publicUrl(path: string): string {
  const { url } = cfg();
  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function uploadToBucket(
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<string> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "31536000",
    },
    body: Buffer.from(bytes),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Upload eșuat (${res.status}): ${t}`);
  }
  return publicUrl(path);
}

export async function deleteFromBucket(path: string): Promise<void> {
  const { url, key } = cfg();
  await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}
