"use client";

import { type ReactNode, useEffect, useState } from "react";
import { auctionImageUrl } from "@/lib/images";
import { LotImage } from "./LotImage";

function iaaiCandidates(image: string): string[] {
  if (!/~I\d+/.test(image)) return image ? [image] : [];
  return Array.from({ length: 20 }, (_, index) => image.replace(/~I\d+/, `~I${index + 1}`));
}

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export function LotGallery({
  lotId,
  source,
  image,
  alt,
  badges,
}: {
  lotId: string;
  source: string;
  image: string;
  alt: string;
  badges: ReactNode;
}) {
  const expectsMore = source === "copart" || /~I\d+/.test(image);
  const [images, setImages] = useState<string[]>(image ? [image] : []);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(expectsMore);

  useEffect(() => {
    let cancelled = false;
    const initial = image ? [image] : [];
    setImages(initial);
    setActive(0);
    const finish = (next: string[]) => {
      if (cancelled) return;
      if (next.length > 0) setImages(next);
      setPending(false);
    };
    if (source === "iaai") {
      const candidates = iaaiCandidates(image);
      if (candidates.length < 2) {
        setPending(false);
        return () => {
          cancelled = true;
        };
      }
      setPending(true);
      void Promise.all(candidates.map(async (url) => ((await loadImage(url)) ? url : ""))).then((found) => {
        finish(found.filter(Boolean));
      });
      return () => {
        cancelled = true;
      };
    }
    if (source === "copart") {
      setPending(true);
      void fetch(`/api/lots/${encodeURIComponent(lotId)}/images`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { images?: string[] } | null) => {
          const next = [...new Set((payload?.images || []).map(auctionImageUrl).filter(Boolean))];
          finish(next);
        })
        .catch(() => finish([]));
    } else setPending(false);
    return () => {
      cancelled = true;
    };
  }, [image, lotId, source]);

  const current = images[active] || images[0] || "";
  const showStrip = pending || images.length > 1;

  return (
    <div className="gallery">
      <div className="photo-frame">
        <LotImage src={current} alt={alt} className="lot-photo" />
        {badges}
      </div>
      {showStrip ? (
        <div className="thumbs" aria-busy={pending} aria-label={pending ? "Загрузка фотографий" : "Фотографии лота"}>
          {pending
            ? Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="thumb-slot" aria-hidden="true">
                  <span className="thumb-loader" />
                </span>
              ))
            : images.map((src, index) => (
                <Thumb
                  key={src}
                  src={src}
                  active={index === active}
                  label={`Фото ${index + 1}`}
                  onClick={() => setActive(index)}
                />
              ))}
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ src, active, label, onClick }: { src: string; active: boolean; label: string; onClick: () => void }) {
  const [ready, setReady] = useState(false);
  return (
    <button type="button" className={active ? "is-active" : undefined} aria-label={label} aria-pressed={active} onClick={onClick}>
      {ready ? null : <span className="thumb-loader" />}
      <LotImage src={src} alt="" onReady={() => setReady(true)} />
    </button>
  );
}
