"use client";

import { type ReactNode, useEffect, useState } from "react";
import { LotImage } from "./LotImage";

function iaaiCandidates(image: string): string[] {
  if (!/~I\d+/.test(image)) return image ? [image] : [];
  return Array.from({ length: 20 }, (_, index) => image.replace(/~I\d+/, `~I${index + 1}`));
}

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
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
  const [images, setImages] = useState<string[]>(image ? [image] : []);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const initial = image ? [image] : [];
    setImages(initial);
    setActive(0);
    if (source === "iaai") {
      void Promise.all(iaaiCandidates(image).map(async (url) => ((await loadImage(url)) ? url : ""))).then((found) => {
        if (cancelled) return;
        const next = found.filter(Boolean);
        if (next.length > 0) setImages(next);
      });
      return () => {
        cancelled = true;
      };
    }
    if (source === "copart") {
      void fetch(`/api/lots/${encodeURIComponent(lotId)}/images`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { images?: string[] } | null) => {
          if (cancelled || !payload?.images?.length) return;
          setImages(payload.images);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [image, lotId, source]);

  const current = images[active] || images[0] || "";

  return (
    <div className="gallery">
      <div className="photo-frame">
        <LotImage src={current} alt={alt} className="lot-photo" />
        {badges}
      </div>
      {images.length > 1 ? (
        <div className="thumbs" aria-label="Фотографии лота">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              className={index === active ? "is-active" : undefined}
              aria-label={`Фото ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
