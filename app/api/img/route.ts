import { auctionImageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8_000_000;

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export async function GET(request: Request) {
  const target = auctionImageUrl(new URL(request.url).searchParams.get("u") || "");
  if (!target) return new Response(null, { status: 400 });

  try {
    const response = await fetch(target, {
      headers: { Accept: "image/jpeg,image/*;q=0.8", "User-Agent": "Mozilla/5.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return new Response(null, { status: 404 });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES || !isJpeg(bytes)) return new Response(null, { status: 404 });
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
