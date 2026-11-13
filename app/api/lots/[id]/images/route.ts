import { cachedImages, getLot, saveImages } from "@/lib/db";
import { copartGallery } from "@/parsers/copart";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const lot = getLot((await params).id);
  if (!lot) return Response.json({ images: [] }, { status: 404 });
  const cached = cachedImages(lot.id);
  if (cached.length > 1) return Response.json({ images: cached });
  if (lot.source !== "copart") return Response.json({ images: lot.image ? [lot.image] : [] });
  try {
    const images = await copartGallery(lot.lotNumber);
    const unique = images.length > 0 ? images : lot.image ? [lot.image] : [];
    if (unique.length > 1) saveImages(lot.id, unique);
    return Response.json({ images: unique });
  } catch {
    return Response.json({ images: lot.image ? [lot.image] : [] });
  }
}
