const HOSTS = new Set(["cs.copart.com", "vis.iaai.com"]);

export function auctionImageUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !HOSTS.has(url.hostname)) return "";
    url.protocol = "https:";
    url.pathname = url.pathname.replace("/ids-c-prod-lpp/", "/lpp/");
    return url.toString();
  } catch {
    return "";
  }
}

export function imageFallbacks(value: string): string[] {
  const direct = auctionImageUrl(value);
  if (!direct) return [];
  const list = [direct];
  if (direct.includes("_ful.")) list.push(direct.replaceAll("_ful.", "_thb."));
  list.push(`/api/img?u=${encodeURIComponent(direct)}`);
  return [...new Set(list)];
}
